import Link from "next/link";
import StoreChrome from "@/components/layout/StoreChrome";

// Used for unknown URLs and notFound() (e.g. missing or inactive products).
export default function NotFound() {
  return (
    <StoreChrome>
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-ink/70">The page you are looking for does not exist or is no longer available.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark">
            Browse the shop
          </Link>
          <Link href="/" className="rounded-full border border-black/20 px-6 py-3 text-sm font-semibold hover:bg-black/5">
            Back to Home
          </Link>
        </div>
      </section>
    </StoreChrome>
  );
}
