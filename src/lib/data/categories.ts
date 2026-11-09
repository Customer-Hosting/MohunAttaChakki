import "server-only";
import { randomBytes } from "node:crypto";
import { collections } from "../db";
import { slugify } from "../format";
import type { Category, Subcategory } from "../site";
import { trimmedString, urlOrEmpty, ValidationError } from "./common";
import { getSettings, SETTINGS_ID } from "./settings";

/*
 * Categories + subcategories are stored in settings.categories (no separate collection).
 * Products reference them by slug: product.category / product.subcategory.
 *
 * Safety rules:
 * - names are required, unique (case-insensitive) and must produce a unique slug;
 * - renaming updates the slug and moves every product that used the old slug;
 * - a category/subcategory that products still use cannot be deleted — reassign them first.
 */

export const MAX_CATEGORIES = 20;
export const MAX_SUBCATEGORIES = 30;

export interface CategoryUsage {
  /** products per category slug (active + inactive) */
  categories: Record<string, number>;
  /** products per "category/subcategory" slug pair */
  subcategories: Record<string, number>;
}

const newId = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex")}`;

function parseName(raw: unknown, label: string): { name: string; slug: string } {
  const name = trimmedString(raw, label, { min: 1, max: 40 }).replace(/\s+/g, " ");
  const slug = slugify(name);
  if (!slug) throw new ValidationError(`${label} must contain letters or numbers.`);
  return { name, slug };
}

export async function getCategories(): Promise<Category[]> {
  return (await getSettings()).categories;
}

export async function getCategoryUsage(): Promise<CategoryUsage> {
  const { products } = await collections();
  const rows = await products
    .aggregate<{ _id: { category: string; subcategory: string | null }; count: number }>([
      { $group: { _id: { category: "$category", subcategory: { $ifNull: ["$subcategory", null] } }, count: { $sum: 1 } } },
    ])
    .toArray();
  const usage: CategoryUsage = { categories: {}, subcategories: {} };
  for (const { _id, count } of rows) {
    usage.categories[_id.category] = (usage.categories[_id.category] ?? 0) + count;
    if (_id.subcategory) usage.subcategories[`${_id.category}/${_id.subcategory}`] = count;
  }
  return usage;
}

async function saveCategories(categories: Category[]): Promise<void> {
  const { settings } = await collections();
  await settings.updateOne({ _id: SETTINGS_ID }, { $set: { categories, updatedAt: new Date() } }, { upsert: true });
}

function findCategoryById(categories: Category[], id: string): Category {
  const category = categories.find((c) => c.id === id);
  if (!category) throw new ValidationError("Category not found. Please refresh and try again.");
  return category;
}

function assertUniqueCategory(categories: Category[], name: string, slug: string, exceptId?: string) {
  const clash = categories.find(
    (c) => c.id !== exceptId && (c.slug === slug || c.name.toLowerCase() === name.toLowerCase()),
  );
  if (clash) throw new ValidationError(`A category called "${clash.name}" already exists.`);
}

function assertUniqueSubcategory(category: Category, name: string, slug: string, exceptId?: string) {
  const clash = category.subcategories.find(
    (s) => s.id !== exceptId && (s.slug === slug || s.name.toLowerCase() === name.toLowerCase()),
  );
  if (clash) throw new ValidationError(`"${category.name}" already has a subcategory called "${clash.name}".`);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(input: { name: unknown; image?: unknown }): Promise<Category[]> {
  const categories = await getCategories();
  if (categories.length >= MAX_CATEGORIES) throw new ValidationError(`At most ${MAX_CATEGORIES} categories are allowed.`);
  const { name, slug } = parseName(input.name, "Category name");
  assertUniqueCategory(categories, name, slug);
  const category: Category = { id: newId("cat"), name, slug, image: urlOrEmpty(input.image, "Category image"), subcategories: [] };
  const next = [...categories, category];
  await saveCategories(next);
  return next;
}

/** Rename and/or change the image. A new name moves products to the new slug. */
export async function updateCategory(id: string, input: { name?: unknown; image?: unknown }): Promise<Category[]> {
  const categories = await getCategories();
  const category = findCategoryById(categories, id);
  let { name, slug } = category;
  if (input.name !== undefined) {
    ({ name, slug } = parseName(input.name, "Category name"));
    assertUniqueCategory(categories, name, slug, id);
  }
  const image = input.image !== undefined ? urlOrEmpty(input.image, "Category image") : category.image;
  const next = categories.map((c) => (c.id === id ? { ...c, name, slug, image } : c));
  await saveCategories(next);
  if (slug !== category.slug) {
    const { products } = await collections();
    await products.updateMany({ category: category.slug }, { $set: { category: slug, updatedAt: new Date() } });
  }
  return next;
}

export async function deleteCategory(id: string): Promise<Category[]> {
  const categories = await getCategories();
  const category = findCategoryById(categories, id);
  const { products } = await collections();
  const used = await products.countDocuments({ category: category.slug });
  if (used > 0) {
    throw new ValidationError(
      `"${category.name}" is used by ${used} product${used === 1 ? "" : "s"}. Move ${used === 1 ? "it" : "them"} to another category first, then delete.`,
    );
  }
  if (categories.length <= 1) throw new ValidationError("Keep at least one category.");
  const next = categories.filter((c) => c.id !== id);
  await saveCategories(next);
  return next;
}

// ---------------------------------------------------------------------------
// Subcategories
// ---------------------------------------------------------------------------

export async function createSubcategory(categoryId: string, input: { name: unknown }): Promise<Category[]> {
  const categories = await getCategories();
  const category = findCategoryById(categories, categoryId);
  if (category.subcategories.length >= MAX_SUBCATEGORIES) {
    throw new ValidationError(`At most ${MAX_SUBCATEGORIES} subcategories per category.`);
  }
  const { name, slug } = parseName(input.name, "Subcategory name");
  assertUniqueSubcategory(category, name, slug);
  const sub: Subcategory = { id: newId("sub"), name, slug };
  const next = categories.map((c) => (c.id === categoryId ? { ...c, subcategories: [...c.subcategories, sub] } : c));
  await saveCategories(next);
  return next;
}

export async function updateSubcategory(categoryId: string, subId: string, input: { name: unknown }): Promise<Category[]> {
  const categories = await getCategories();
  const category = findCategoryById(categories, categoryId);
  const sub = category.subcategories.find((s) => s.id === subId);
  if (!sub) throw new ValidationError("Subcategory not found. Please refresh and try again.");
  const { name, slug } = parseName(input.name, "Subcategory name");
  assertUniqueSubcategory(category, name, slug, subId);
  const next = categories.map((c) =>
    c.id === categoryId ? { ...c, subcategories: c.subcategories.map((s) => (s.id === subId ? { ...s, name, slug } : s)) } : c,
  );
  await saveCategories(next);
  if (slug !== sub.slug) {
    const { products } = await collections();
    await products.updateMany(
      { category: category.slug, subcategory: sub.slug },
      { $set: { subcategory: slug, updatedAt: new Date() } },
    );
  }
  return next;
}

export async function deleteSubcategory(categoryId: string, subId: string): Promise<Category[]> {
  const categories = await getCategories();
  const category = findCategoryById(categories, categoryId);
  const sub = category.subcategories.find((s) => s.id === subId);
  if (!sub) throw new ValidationError("Subcategory not found. Please refresh and try again.");
  const { products } = await collections();
  const used = await products.countDocuments({ category: category.slug, subcategory: sub.slug });
  if (used > 0) {
    throw new ValidationError(
      `"${sub.name}" is used by ${used} product${used === 1 ? "" : "s"}. Change ${used === 1 ? "its" : "their"} subcategory first, then delete.`,
    );
  }
  const next = categories.map((c) =>
    c.id === categoryId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c,
  );
  await saveCategories(next);
  return next;
}
