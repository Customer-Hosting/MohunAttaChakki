import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/product/ProductCard";
import Pagination from "@/components/shop/Pagination";
import { CategoryChips, CategorySidebar, SearchSortForm } from "@/components/shop/ShopFilters";
import { shopHref } from "@/components/shop/shop-url";
import { getShopPage, getStoreSettings, SHOP_SORTS, type ShopSort } from "@/lib/catalog";
import { normalizeSearch } from "@/lib/data/products";
import { slugify } from "@/lib/format";
import { openGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop Atta, Besan, Sattu & Pulses",
  description:
    "Shop chakki fresh atta, besan, sattu, maida, sooji, roasted chana and pulses from Mohan Atta Chakki, Burdwan. Pure, fresh and healthy.",
  alternates: { canonical: "/shop" },
  openGraph: openGraph({ title: "Shop | Mohan Atta Chakki", url: "/shop" }),
};

/** Matches a URL value against a slug or a name ("Atta", "atta", "Matar Besan", "matar-besan"). */
function matches(value: string, item: { slug: string; name: string }) {
  const v = value.trim().toLowerCase();
  return v !== "" && (item.slug === v || item.name.toLowerCase() === v || slugify(v) === item.slug);
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <Suspense fallback={<ShopSkeleton />}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

async function ShopResults({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const params = await searchParams;
  const settings = await getStoreSettings();

  // Unknown categories/subcategories and invalid values fall back to defaults instead of erroring.
  const selected = settings.categories.find((c) => matches(first(params.category), c));
  const category = selected?.slug ?? "";
  const selectedSub = selected?.subcategories.find((s) => matches(first(params.subcategory), s));
  const subcategory = selectedSub?.slug ?? "";
  const q = normalizeSearch(first(params.q));
  const sortParam = first(params.sort);
  const sort: ShopSort = SHOP_SORTS.includes(sortParam as ShopSort) ? (sortParam as ShopSort) : "newest";
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);

  const result = await getShopPage({ category, subcategory, search: q, sort, page });
  const title = selected ? (selectedSub ? `${selected.name}: ${selectedSub.name}` : selected.name) : "Shop";
  const filtered = Boolean(category || q);
  const filters = { categories: settings.categories, category, subcategory, q, sort };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-ink/70" aria-live="polite">
          {result.total === 1 ? "1 product" : `${result.total} products`}
          {q && (
            <>
              {" "}
              for “<span className="font-medium text-ink">{q}</span>”
            </>
          )}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <CategorySidebar {...filters} />
        <div>
          <div className="space-y-4">
            <SearchSortForm category={category} subcategory={subcategory} q={q} sort={sort} />
            <CategoryChips {...filters} />
          </div>

          {result.products.length > 0 ? (
            <>
              <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5">
                {result.products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} ctaLabel="View Details" />
                  </li>
                ))}
              </ul>
              <Pagination page={result.page} pageCount={result.pageCount} params={{ category, subcategory, q, sort }} />
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold">
                {filtered ? "No products found" : "Fresh stock coming soon"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">
                {filtered
                  ? "Try a different search or category."
                  : "We are adding our latest products. Please check back shortly."}
              </p>
              {filtered && (
                <Link
                  href={shopHref({ sort })}
                  className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark"
                >
                  Show all products
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ShopSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-9 w-40 rounded bg-neutral-200" />
      <div className="mt-6 h-10 rounded-lg bg-neutral-100" />
      <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <div className="aspect-[4/5] rounded-xl bg-neutral-100" />
            <div className="mt-3 h-4 w-2/3 rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-1/3 rounded bg-neutral-100" />
          </li>
        ))}
      </ul>
    </div>
  );
}
