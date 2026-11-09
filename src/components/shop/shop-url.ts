import type { ShopSort } from "@/lib/catalog";

export interface ShopParams {
  category?: string;
  subcategory?: string;
  q?: string;
  sort?: ShopSort;
  page?: number;
}

/** Builds a /shop URL, leaving out default values so links stay short. */
export function shopHref({ category, subcategory, q, sort, page }: ShopParams): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (category && subcategory) params.set("subcategory", subcategory);
  if (q) params.set("q", q);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
