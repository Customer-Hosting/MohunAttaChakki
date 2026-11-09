import type { Product, ProductVariant } from "./types";

/*
 * Pack sizes with their own price, stock and photos (e.g. 250 g / 500 g / 1 kg).
 * Shared by the shop (browser) and the server. A product without variants works as before:
 * one price and one stock number for all its sizes.
 */

type Priced = { price: number; salePrice?: number | null };

/** The price a customer actually pays. */
export function payPrice(p: Priced): number {
  return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
}

export function hasVariants(p: { variants?: ProductVariant[] | null }): boolean {
  return Array.isArray(p.variants) && p.variants.length > 0;
}

export function findVariant(p: { variants?: ProductVariant[] | null }, label: string | null | undefined): ProductVariant | undefined {
  return label ? p.variants?.find((v) => v.label === label) : undefined;
}

/** The cheapest pack (by the price paid); used for "From ₹…" and price sorting. */
export function cheapestVariant(variants: ProductVariant[]): ProductVariant | undefined {
  return variants.reduce<ProductVariant | undefined>((best, v) => (!best || payPrice(v) < payPrice(best) ? v : best), undefined);
}

/** Photos for the selected pack first, then the product's general photos (no duplicates). */
export function imagesFor(p: Pick<Product, "images"> & { variants?: ProductVariant[] | null }, label?: string | null): string[] {
  const own = findVariant(p, label)?.images ?? [];
  return [...new Set([...own, ...p.images])];
}

/** Images to show where no pack is selected (cards, lists): general photos, else the first pack photo. */
export function displayImages(p: Pick<Product, "images"> & { variants?: ProductVariant[] | null }): string[] {
  if (p.images.length) return p.images;
  return p.variants?.find((v) => v.images.length)?.images ?? [];
}

/** Every image URL a product uses (general + all packs), e.g. for upload clean-up. */
export function allProductImages(p: { images: string[]; variants?: ProductVariant[] | null }): string[] {
  return [...new Set([...p.images, ...(p.variants ?? []).flatMap((v) => v.images)])];
}
