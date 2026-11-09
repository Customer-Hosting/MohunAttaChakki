import "server-only";
import type { OrderItem } from "../types";
import { ValidationError } from "./common";
import { findVariant, hasVariants, imagesFor, payPrice } from "../variants";
import { effectivePrice, getProductsByIds } from "./products";
import { getSettings } from "./settings";

/*
 * Prices a cart on the server. The browser only sends product id, size and quantity —
 * names, prices, stock and the shipping charge always come from MongoDB.
 */

export const MAX_LINES = 50;
export const MAX_QTY = 10;

export interface CartLineInput {
  productId: string;
  size: string | null;
  quantity: number;
}

export interface QuotedLine extends CartLineInput {
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  stock: number;
  /** Set when the line can't be bought as-is (removed, out of stock, too many, size gone). */
  problem: string | null;
}

export interface CartQuote {
  lines: QuotedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  /** true when every line can be ordered */
  ok: boolean;
}

export function parseCartLines(raw: unknown): CartLineInput[] {
  if (!Array.isArray(raw)) throw new ValidationError("Your cart is empty.");
  if (raw.length > MAX_LINES) throw new ValidationError(`At most ${MAX_LINES} different items per order.`);
  return raw.map((item) => {
    const i = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const quantity = Number(i.quantity);
    if (typeof i.productId !== "string" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw new ValidationError("Your cart contains an invalid item. Please remove it and try again.");
    }
    const size = typeof i.size === "string" && i.size ? i.size : null;
    return { productId: i.productId, size, quantity };
  });
}

/** Unknown/inactive products are reported (not thrown) so the cart page can show them. */
export async function quoteCart(lines: CartLineInput[]): Promise<CartQuote> {
  const [products, settings] = await Promise.all([getProductsByIds(lines.map((l) => l.productId)), getSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  // Products with pack sizes keep stock per pack; otherwise different sizes share the product stock.
  const stockKey = (productId: string, size: string | null) =>
    hasVariants(byId.get(productId) ?? {}) ? `${productId}|${size ?? ""}` : productId;
  const wanted = new Map<string, number>();
  for (const l of lines) {
    const key = stockKey(l.productId, l.size);
    wanted.set(key, (wanted.get(key) ?? 0) + l.quantity);
  }

  const quoted: QuotedLine[] = lines.map((line) => {
    const p = byId.get(line.productId);
    if (!p) {
      return { ...line, slug: "", name: "This product is no longer available", image: null, unitPrice: 0, originalPrice: 0, lineTotal: 0, stock: 0, problem: "No longer available — please remove it." };
    }
    if (hasVariants(p)) {
      const v = findVariant(p, line.size);
      let problem: string | null = null;
      if (!v) problem = "Please choose the pack size again on the product page.";
      else if (v.stock <= 0) problem = "Out of stock — please remove it.";
      else if ((wanted.get(stockKey(p.id, line.size)) ?? 0) > v.stock) problem = `Only ${v.stock} left — please reduce the quantity.`;
      const unitPrice = v ? payPrice(v) : 0;
      return {
        ...line,
        slug: p.slug,
        name: p.name,
        image: imagesFor(p, line.size)[0] ?? null,
        unitPrice,
        originalPrice: v?.price ?? 0,
        lineTotal: unitPrice * line.quantity,
        stock: v?.stock ?? 0,
        problem,
      };
    }
    let problem: string | null = null;
    if (p.sizes.length > 0 && (!line.size || !p.sizes.includes(line.size))) problem = "Please choose the size again on the product page.";
    else if (p.sizes.length === 0 && line.size) problem = "Please add this item again from the product page.";
    else if (p.stock <= 0) problem = "Out of stock — please remove it.";
    else if ((wanted.get(p.id) ?? 0) > p.stock) problem = `Only ${p.stock} left — please reduce the quantity.`;
    const unitPrice = effectivePrice(p);
    return {
      ...line,
      slug: p.slug,
      name: p.name,
      image: p.images[0] ?? null,
      unitPrice,
      originalPrice: p.price,
      lineTotal: unitPrice * line.quantity,
      stock: p.stock,
      problem,
    };
  });

  const subtotal = quoted.filter((l) => !l.problem).reduce((sum, l) => sum + l.lineTotal, 0);
  const ok = quoted.length > 0 && quoted.every((l) => !l.problem);
  const shipping = quoted.some((l) => !l.problem) ? settings.shippingCharge : 0;
  return { lines: quoted, subtotal, shipping, total: subtotal + shipping, ok };
}

export function toOrderItems(quote: CartQuote): OrderItem[] {
  return quote.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    slug: l.slug,
    image: l.image,
    size: l.size,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
  }));
}
