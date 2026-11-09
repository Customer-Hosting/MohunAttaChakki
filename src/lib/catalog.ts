import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { countProducts, getProductBySlug, listProducts, PRODUCTS_TAG } from "./data/products";
import { DEFAULT_SETTINGS, getSettings } from "./data/settings";
import type { Product, Settings } from "./types";

/*
 * Cached storefront reads. Pages render from these instead of hitting MongoDB on every visit.
 * Admin changes call revalidateTag(PRODUCTS_TAG / SETTINGS_TAG) so updates appear right away;
 * otherwise entries refresh on the "hours" schedule.
 *
 * "use cache: remote": on Vercel each serverless instance has its own short-lived memory, so the
 * default in-memory cache missed on most requests (measured: repeat /shop visits cost as much as
 * two MongoDB round trips). The remote handler shares entries across instances; where no remote
 * handler exists, Next.js falls back to the same in-memory LRU as before.
 *
 * Before MONGODB_URI is configured (e.g. a local build without secrets) these return defaults
 * so the site still builds and renders. Once configured, database errors are NOT swallowed.
 */

export const SETTINGS_TAG = "settings";

const dbConfigured = () => Boolean(process.env.MONGODB_URI);

export async function getStoreSettings(): Promise<Settings> {
  "use cache: remote";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  if (!dbConfigured()) return DEFAULT_SETTINGS;
  return getSettings();
}

/**
 * Products for the home page: featured products, or — if none are marked featured yet —
 * the newest active products, so the section isn't empty while the admin sets things up.
 */
export async function getHomeProducts(limit = 8): Promise<{ products: Product[]; isFeatured: boolean }> {
  "use cache: remote";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  if (!dbConfigured()) return { products: [], isFeatured: true };
  const featured = await listProducts({ featured: true, limit });
  if (featured.length > 0) return { products: featured, isFeatured: true };
  return { products: await listProducts({ limit }), isFeatured: false };
}

export const SHOP_PAGE_SIZE = 12;
export const SHOP_SORTS = ["newest", "price-asc", "price-desc"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export interface ShopQuery {
  category: string; // "" for all
  subcategory: string; // "" for all (only used with a category)
  search: string; // "" for none
  sort: ShopSort;
  page: number; // 1-based
}

export interface ShopResult {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
}

/** One page of the shop listing. Arguments are part of the cache key. Only active products. */
export async function getShopPage({ category, subcategory, search, sort, page }: ShopQuery): Promise<ShopResult> {
  "use cache: remote";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  if (!dbConfigured()) return { products: [], total: 0, page: 1, pageCount: 1 };

  const filter = {
    category: category || undefined,
    subcategory: (category && subcategory) || undefined,
    search: search || undefined,
  };
  const total = await countProducts(filter);
  const pageCount = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const products = await listProducts({
    ...filter,
    sort,
    limit: SHOP_PAGE_SIZE,
    skip: (current - 1) * SHOP_PAGE_SIZE,
  });
  return { products, total, page: current, pageCount };
}

/** A single active product by slug for the product page (null if missing or inactive). */
export async function getProductForPage(slug: string): Promise<Product | null> {
  "use cache: remote";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  if (!dbConfigured()) return null;
  return getProductBySlug(slug);
}

/** Active product slugs + update times for sitemap.xml. */
export async function getSitemapProducts(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache: remote";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  if (!dbConfigured()) return [];
  return (await listProducts({ limit: 500 })).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
}
