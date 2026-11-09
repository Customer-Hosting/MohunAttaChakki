import "server-only";
import { MongoServerError, type Filter, type WithId } from "mongodb";
import { collections } from "../db";
import { slugify } from "../format";
import { defaultSizesFor, type Category } from "../site";
import type { Product, ProductDoc, ProductVariant } from "../types";
import { cheapestVariant, payPrice } from "../variants";
import { clampLimit, toObjectId, trimmedString, urlOrEmpty, ValidationError } from "./common";
import { getSettings } from "./settings";

/** Cache tag for product data (used by pages with `cacheTag`, invalidated after admin edits). */
export const PRODUCTS_TAG = "products";

export const MAX_IMAGES = 8;
export const MAX_VARIANTS = 20;
export const MAX_PRICE = 1_000_000;

export function toProduct(doc: WithId<ProductDoc>): Product {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    category: doc.category,
    subcategory: doc.subcategory ?? null,
    price: doc.price,
    salePrice: doc.salePrice ?? null,
    images: doc.images,
    sizes: doc.sizes,
    stock: doc.stock,
    variants: doc.variants ?? [],
    featured: doc.featured,
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** The price a customer actually pays. */
export function effectivePrice(product: Pick<ProductDoc, "price" | "salePrice">): number {
  return payPrice(product);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ProductInput = Omit<ProductDoc, "_id" | "createdAt" | "updatedAt" | "variants"> & { variants: ProductVariant[] };

function money(value: unknown, field: string): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > MAX_PRICE) {
    throw new ValidationError(`${field} must be a number between 1 and ${MAX_PRICE}.`);
  }
  return Math.round(n * 100) / 100;
}

function stockNumber(value: unknown, field: string): number {
  const n = value === undefined || value === "" || value === null ? 0 : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100_000) throw new ValidationError(`${field} must be a whole number of 0 or more.`);
  return n;
}

function imageList(value: unknown, field: string): string[] {
  const images = value ?? [];
  if (!Array.isArray(images)) throw new ValidationError(`${field} must be a list.`);
  if (images.length > MAX_IMAGES) throw new ValidationError(`At most ${MAX_IMAGES} images are allowed (${field}).`);
  return images.map((url) => urlOrEmpty(url, "Image")).filter(Boolean);
}

/** Pack sizes with their own price, sale price, stock and photos. */
function parseVariants(raw: unknown): ProductVariant[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError("Pack sizes must be a list.");
  if (raw.length > MAX_VARIANTS) throw new ValidationError(`At most ${MAX_VARIANTS} pack sizes are allowed.`);
  const seen = new Set<string>();
  return raw.map((item, i) => {
    const v = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const row = `Pack size ${i + 1}`;
    const label = trimmedString(v.label, `${row} name`, { min: 1, max: 20 }).replace(/s+/g, " ");
    const key = label.toLowerCase();
    if (seen.has(key)) throw new ValidationError(`Pack size "${label}" is listed twice.`);
    seen.add(key);
    const price = money(v.price, `${label} price`);
    let salePrice: number | null = null;
    if (v.salePrice !== undefined && v.salePrice !== null && v.salePrice !== "") {
      salePrice = money(v.salePrice, `${label} sale price`);
      if (salePrice >= price) throw new ValidationError(`${label}: sale price must be lower than the price.`);
    }
    return { label, price, salePrice, stock: stockNumber(v.stock, `${label} stock`), images: imageList(v.images, `${label} images`) };
  });
}

/**
 * Validates and normalises a full product. Unknown fields are dropped.
 * `categories` is the current category list from settings; subcategory is optional but, when
 * given, must belong to the chosen category.
 */
export type CategoryChoice = Pick<Category, "slug"> & { subcategories: { slug: string }[] };

export function parseProductInput(raw: unknown, categories: CategoryChoice[]): ProductInput {
  if (!raw || typeof raw !== "object") throw new ValidationError("Invalid product data.");
  const input = raw as Record<string, unknown>;

  const name = trimmedString(input.name, "Name", { min: 2, max: 120 });
  const slug = slugify(trimmedString(input.slug, "Slug", { max: 120 }) || name);
  if (!slug) throw new ValidationError("Slug must contain letters or numbers.");

  const categoryChoice = typeof input.category === "string" ? categories.find((c) => c.slug === input.category) : undefined;
  if (!categoryChoice) throw new ValidationError("Please choose a valid category.");
  const category = categoryChoice.slug;

  let subcategory: string | null = null;
  if (input.subcategory !== undefined && input.subcategory !== null && input.subcategory !== "") {
    if (typeof input.subcategory !== "string" || !categoryChoice.subcategories.some((s) => s.slug === input.subcategory)) {
      throw new ValidationError("Please choose a subcategory that belongs to the selected category.");
    }
    subcategory = input.subcategory;
  }

  const cleanImages = imageList(input.images, "Images");
  const variants = parseVariants(input.variants);

  // With pack sizes, price / stock / sizes are derived from them, so the shop list, price sorting,
  // filters and "out of stock" keep working unchanged.
  if (variants.length > 0) {
    const cheapest = cheapestVariant(variants)!;
    return {
      name,
      slug,
      description: trimmedString(input.description, "Description", { max: 5000 }),
      category,
      subcategory,
      price: cheapest.price,
      salePrice: cheapest.salePrice,
      images: cleanImages,
      sizes: variants.map((v) => v.label),
      stock: variants.reduce((sum, v) => sum + v.stock, 0),
      variants,
      featured: input.featured === true,
      active: input.active === undefined ? true : input.active === true,
    };
  }

  const price = money(input.price, "Price");
  let salePrice: number | null = null;
  if (input.salePrice !== undefined && input.salePrice !== null && input.salePrice !== "") {
    salePrice = money(input.salePrice, "Sale price");
    if (salePrice >= price) throw new ValidationError("Sale price must be lower than the price.");
  }

  let sizes: string[];
  if (input.sizes === undefined) {
    sizes = defaultSizesFor(category);
  } else {
    if (!Array.isArray(input.sizes)) throw new ValidationError("Sizes must be a list.");
    sizes = [...new Set(input.sizes.map((s) => trimmedString(s, "Size", { max: 20 })).filter(Boolean))];
    if (sizes.length > 20) throw new ValidationError("At most 20 sizes are allowed.");
  }

  const stockRaw = stockNumber(input.stock, "Stock");

  return {
    name,
    slug,
    description: trimmedString(input.description, "Description", { max: 5000 }),
    category,
    subcategory,
    price,
    salePrice,
    images: cleanImages,
    sizes,
    stock: stockRaw,
    variants: [],
    featured: input.featured === true,
    active: input.active === undefined ? true : input.active === true,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type ProductSort = "newest" | "price-asc" | "price-desc";

export interface ProductQuery {
  category?: string;
  /** Subcategory slug (only meaningful together with `category`). */
  subcategory?: string;
  /** Case-insensitive match on the product name. */
  search?: string;
  featured?: boolean;
  /** Admin views pass true; the storefront only ever sees active products. */
  includeInactive?: boolean;
  sort?: ProductSort;
  limit?: number;
  skip?: number;
}

function buildFilter(query: ProductQuery): Filter<ProductDoc> {
  const filter: Filter<ProductDoc> = {};
  if (!query.includeInactive) filter.active = true;
  if (query.category) filter.category = query.category;
  if (query.category && query.subcategory) filter.subcategory = query.subcategory;
  if (query.featured !== undefined) filter.featured = query.featured;
  const search = normalizeSearch(query.search);
  if (search) {
    // Every word must appear in the name, in any order ("fresh atta" matches "Atta Fresh").
    filter.$and = search.split(" ").map((word) => ({ name: { $regex: escapeRegex(word), $options: "i" } }));
  }
  return filter;
}

export const MAX_SEARCH_LENGTH = 60;

/** Trims, collapses spaces and caps length. Returns "" for no search. */
export function normalizeSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { products } = await collections();
  const filter = buildFilter(query);
  const limit = clampLimit(query.limit, 100, 500);
  const skip = Math.max(0, Math.floor(query.skip ?? 0));

  if (query.sort === "price-asc" || query.sort === "price-desc") {
    // Sort by the price the customer pays (sale price when set).
    const docs = await products
      .aggregate<WithId<ProductDoc>>([
        { $match: filter },
        { $addFields: { _effective: { $ifNull: ["$salePrice", "$price"] } } },
        { $sort: { _effective: query.sort === "price-asc" ? 1 : -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _effective: 0 } },
      ])
      .toArray();
    return docs.map(toProduct);
  }

  const docs = await products.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray();
  return docs.map(toProduct);
}

export async function countProducts(query: Omit<ProductQuery, "sort" | "limit" | "skip"> = {}): Promise<number> {
  const { products } = await collections();
  return products.countDocuments(buildFilter(query));
}

export async function getProductBySlug(slug: string, { includeInactive = false } = {}): Promise<Product | null> {
  const { products } = await collections();
  const doc = await products.findOne(includeInactive ? { slug } : { slug, active: true });
  return doc ? toProduct(doc) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { products } = await collections();
  const doc = await products.findOne({ _id });
  return doc ? toProduct(doc) : null;
}

export async function getProductsByIds(ids: string[], { includeInactive = false } = {}): Promise<Product[]> {
  const objectIds = ids.map(toObjectId).filter((id) => id !== null);
  if (objectIds.length === 0) return [];
  const { products } = await collections();
  const filter: Filter<ProductDoc> = { _id: { $in: objectIds } };
  if (!includeInactive) filter.active = true;
  return (await products.find(filter).toArray()).map(toProduct);
}

// ---------------------------------------------------------------------------
// Mutations (admin)
// ---------------------------------------------------------------------------

/** Returns `base`, or `base-2`, `base-3`… if the slug is already used by another product. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const { products } = await collections();
  const exclude = excludeId ? toObjectId(excludeId) : null;
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await products.findOne(
      exclude ? { slug: candidate, _id: { $ne: exclude } } : { slug: candidate },
      { projection: { _id: 1 } },
    );
    if (!clash) return candidate;
  }
  throw new ValidationError("Could not create a unique slug. Please choose another name.");
}

function isDuplicateKey(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

async function categoryChoices(): Promise<CategoryChoice[]> {
  return (await getSettings()).categories;
}

export async function createProduct(raw: unknown): Promise<Product> {
  const data = parseProductInput(raw, await categoryChoices());
  const { products } = await collections();
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = { ...data, slug: await uniqueSlug(data.slug), createdAt: now, updatedAt: now };
    try {
      const { insertedId } = await products.insertOne(doc as ProductDoc);
      return toProduct({ ...doc, _id: insertedId });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error; // slug taken concurrently — try the next one
    }
  }
  throw new ValidationError("Could not save the product. Please try again.");
}

/** Partial update: the given fields are merged over the current product and re-validated. */
export async function updateProduct(id: string, raw: unknown): Promise<Product | null> {
  const _id = toObjectId(id);
  if (!_id || !raw || typeof raw !== "object") return null;
  const { products } = await collections();
  const current = await products.findOne({ _id });
  if (!current) return null;

  const changes = raw as Record<string, unknown>;
  const merged = { ...current, ...changes };
  // Changing the category without sending sizes keeps the existing sizes.
  if (changes.sizes === undefined) merged.sizes = current.sizes;
  // Changing the category without choosing a subcategory clears a subcategory that no longer fits.
  const allowed: CategoryChoice[] = await categoryChoices();
  if (changes.category !== undefined && changes.subcategory === undefined && changes.category !== current.category) {
    merged.subcategory = null;
  }
  // A product may keep an older category/subcategory it already has; only new choices are checked.
  const own = allowed.find((c) => c.slug === current.category);
  if (!own) allowed.push({ slug: current.category, subcategories: current.subcategory ? [{ slug: current.subcategory }] : [] });
  else if (current.subcategory && !own.subcategories.some((s) => s.slug === current.subcategory)) {
    allowed[allowed.indexOf(own)] = { ...own, subcategories: [...own.subcategories, { slug: current.subcategory }] };
  }
  const data = parseProductInput(merged, allowed);
  if (data.slug !== current.slug) data.slug = await uniqueSlug(data.slug, id);

  try {
    const updated = await products.findOneAndUpdate(
      { _id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return updated ? toProduct(updated) : null;
  } catch (error) {
    if (isDuplicateKey(error)) throw new ValidationError("That slug is already used by another product.");
    throw error;
  }
}

/** Returns the deleted product (so the caller can remove its images), or null if not found. */
export async function deleteProduct(id: string): Promise<Product | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { products } = await collections();
  const doc = await products.findOneAndDelete({ _id });
  return doc ? toProduct(doc) : null;
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

export interface StockLine {
  productId: string;
  quantity: number;
  /** Pack size. Products with pack sizes keep stock per pack; others share one stock number. */
  size?: string | null;
}

/** A product with pack sizes: the chosen pack. Otherwise null (one shared stock number). */
type StockTarget = { productId: string; variant: string | null; quantity: number };

/**
 * Groups lines by what they draw stock from: the pack for products with pack sizes, the whole
 * product otherwise (different sizes of one product share its stock).
 */
async function stockTargets(lines: StockLine[]): Promise<StockTarget[]> {
  const ids = [...new Set(lines.map((l) => l.productId))].map(toObjectId).filter((id) => id !== null);
  const { products } = await collections();
  const docs = ids.length ? await products.find({ _id: { $in: ids } }, { projection: { "variants.label": 1 } }).toArray() : [];
  const labels = new Map(docs.map((d) => [d._id.toHexString(), new Set((d.variants ?? []).map((v) => v.label))]));
  const totals = new Map<string, StockTarget>();
  for (const { productId, quantity, size } of lines) {
    const packs = labels.get(productId);
    const variant = packs && packs.size > 0 ? (size ?? "") : null;
    const key = `${productId}|${variant ?? ""}`;
    const t = totals.get(key) ?? { productId, variant, quantity: 0 };
    t.quantity += quantity;
    totals.set(key, t);
  }
  return [...totals.values()];
}

/**
 * Atomically takes stock for every line, or none at all.
 * Each decrement only succeeds if enough stock remains (`stock >= qty`, per pack for products with
 * pack sizes), so two customers can never buy the same last item. If any line fails, the earlier
 * decrements are put back. The product total (`stock`) moves together with the pack.
 */
export async function reserveStock(
  lines: StockLine[],
): Promise<{ ok: true } | { ok: false; productId: string }> {
  const { products } = await collections();
  const done: StockTarget[] = [];
  for (const t of await stockTargets(lines)) {
    const _id = toObjectId(t.productId);
    const valid = _id && Number.isInteger(t.quantity) && t.quantity > 0;
    const now = new Date();
    const result = !valid
      ? null
      : t.variant !== null
        ? await products.updateOne(
            { _id, active: true, variants: { $elemMatch: { label: t.variant, stock: { $gte: t.quantity } } } },
            { $inc: { "variants.$.stock": -t.quantity, stock: -t.quantity }, $set: { updatedAt: now } },
          )
        : await products.updateOne(
            { _id, active: true, stock: { $gte: t.quantity } },
            { $inc: { stock: -t.quantity }, $set: { updatedAt: now } },
          );
    if (!result || result.modifiedCount !== 1) {
      await putBack(done);
      return { ok: false, productId: t.productId };
    }
    done.push(t);
  }
  return { ok: true };
}

async function putBack(targets: StockTarget[]): Promise<void> {
  const { products } = await collections();
  for (const t of targets) {
    const _id = toObjectId(t.productId);
    if (!_id || !(t.quantity > 0)) continue;
    const now = new Date();
    if (t.variant !== null) {
      const r = await products.updateOne(
        { _id, "variants.label": t.variant },
        { $inc: { "variants.$.stock": t.quantity, stock: t.quantity }, $set: { updatedAt: now } },
      );
      if (r.matchedCount === 1) continue;
      // The pack was renamed or removed since: return the stock to the product total.
    }
    await products.updateOne({ _id }, { $inc: { stock: t.quantity }, $set: { updatedAt: now } });
  }
}

/** Puts stock back (e.g. when an order is cancelled). */
export async function releaseStock(lines: StockLine[]): Promise<void> {
  await putBack(await stockTargets(lines));
}

/** Products (active or hidden) with no stock left — shown on the admin dashboard. */
export async function countOutOfStock(): Promise<number> {
  const { products } = await collections();
  return products.countDocuments({ stock: { $lte: 0 } });
}
