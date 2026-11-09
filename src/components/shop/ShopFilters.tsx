import Link from "next/link";
import type { ShopSort } from "@/lib/catalog";
import { MAX_SEARCH_LENGTH } from "@/lib/data/products";
import type { Category } from "@/lib/site";
import { shopHref } from "./shop-url";
import SortSelect from "./SortSelect";

interface FilterProps {
  categories: Category[];
  category: string;
  subcategory: string;
  q: string;
  sort: ShopSort;
}

/** Search + sort (plain GET form — works without JavaScript). Changing any filter goes back to page 1. */
export function SearchSortForm({ category, subcategory, q, sort }: Omit<FilterProps, "categories">) {
  return (
    <form action="/shop" method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {category && <input type="hidden" name="category" value={category} />}
      {category && subcategory && <input type="hidden" name="subcategory" value={subcategory} />}
      <div className="flex flex-1 gap-2">
        <label className="sr-only" htmlFor="shop-search">
          Search products
        </label>
        <input
          id="shop-search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search products…"
          className="min-w-0 flex-1 rounded-lg border border-black/20 bg-white px-3 py-2 text-base outline-none focus:border-ink focus:ring-2 focus:ring-brand sm:text-sm"
        />
        <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent">
          Search
        </button>
      </div>
      <SortSelect value={sort} />
    </form>
  );
}

const chip = (active: boolean) =>
  `block shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
    active ? "border-ink bg-ink text-white" : "border-black/15 bg-white hover:border-ink hover:bg-brand"
  }`;

/** Mobile/tablet: category chips, then the selected category's subcategory chips. */
export function CategoryChips({ categories, category, subcategory, q, sort }: FilterProps) {
  const selected = categories.find((c) => c.slug === category);
  return (
    <div className="space-y-2 lg:hidden">
      <nav aria-label="Categories" className="-mx-4 overflow-x-auto overflow-y-hidden px-4 py-1 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          <li>
            <Link href={shopHref({ q, sort })} className={chip(!category)} aria-current={!category ? "page" : undefined}>
              All
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={shopHref({ category: c.slug, q, sort })} className={chip(category === c.slug)} aria-current={category === c.slug ? "page" : undefined}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {selected && selected.subcategories.length > 0 && (
        <nav aria-label={`${selected.name} subcategories`} className="-mx-4 overflow-x-auto overflow-y-hidden px-4 py-1 [scrollbar-width:none]">
          <ul className="flex w-max gap-2">
            <li>
              <Link href={shopHref({ category, q, sort })} className={chip(!subcategory).replace("py-2", "py-1.5")} aria-current={!subcategory ? "page" : undefined}>
                All {selected.name}
              </Link>
            </li>
            {selected.subcategories.map((s) => (
              <li key={s.id}>
                <Link
                  href={shopHref({ category, subcategory: s.slug, q, sort })}
                  className={chip(subcategory === s.slug).replace("py-2", "py-1.5")}
                  aria-current={subcategory === s.slug ? "page" : undefined}
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

/** Desktop: simple sidebar. Only the selected category's subcategories are listed. */
export function CategorySidebar({ categories, category, subcategory, q, sort }: FilterProps) {
  const link = (active: boolean) =>
    `block rounded-lg px-3 py-2 text-sm transition-all duration-200 ${active ? "bg-ink font-semibold text-white" : "hover:translate-x-1 hover:bg-brand/60 motion-reduce:hover:translate-x-0"}`;
  return (
    <nav aria-label="Shop categories" className="hidden lg:block">
      <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-ink/60">Category</h2>
      <ul className="space-y-1">
        <li>
          <Link href={shopHref({ q, sort })} className={link(!category)} aria-current={!category ? "page" : undefined}>
            All products
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={shopHref({ category: c.slug, q, sort })} className={link(category === c.slug && !subcategory)} aria-current={category === c.slug && !subcategory ? "page" : undefined}>
              {c.name}
            </Link>
            {category === c.slug && c.subcategories.length > 0 && (
              <ul className="ml-3 mt-1 space-y-1 border-l border-black/10 pl-2" aria-label={`${c.name} subcategories`}>
                {c.subcategories.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={shopHref({ category: c.slug, subcategory: s.slug, q, sort })}
                      className={link(subcategory === s.slug)}
                      aria-current={subcategory === s.slug ? "page" : undefined}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
