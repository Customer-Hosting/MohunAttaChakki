import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import SectionHeading from "./SectionHeading";

export default function FeaturedProducts({
  products,
  isFeatured,
  instagram,
}: {
  products: Product[];
  isFeatured: boolean;
  instagram: string;
}) {
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Fresh from the chakki"
          title={isFeatured ? "Featured Products" : "Latest Products"}
          link={products.length > 0 ? { href: "/shop", label: "Shop all" } : undefined}
        />

        {products.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold">Fresh stock coming soon</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">
              We are adding our chakki atta, besan, sattu and pulses. Please check back shortly.
            </p>
            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark"
              >
                Follow us on Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
