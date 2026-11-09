import Link from "next/link";
import { shopHref, type ShopParams } from "./shop-url";

/** Previous / page numbers / Next. Shows at most 5 numbers around the current page. */
export default function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Omit<ShopParams, "page">;
}) {
  if (pageCount <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i);
  const base = "grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-medium";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={shopHref({ ...params, page: page - 1 })} className={`${base} border-black/15 transition-colors hover:border-ink hover:bg-brand`} rel="prev">
          ← Prev
        </Link>
      ) : (
        <span className={`${base} border-black/10 text-ink/30`}>← Prev</span>
      )}
      {pages.map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className={`${base} border-ink bg-ink text-white`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={shopHref({ ...params, page: n })} className={`${base} border-black/15 transition-colors hover:border-ink hover:bg-brand`}>
            {n}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={shopHref({ ...params, page: page + 1 })} className={`${base} border-black/15 transition-colors hover:border-ink hover:bg-brand`} rel="next">
          Next →
        </Link>
      ) : (
        <span className={`${base} border-black/10 text-ink/30`}>Next →</span>
      )}
    </nav>
  );
}
