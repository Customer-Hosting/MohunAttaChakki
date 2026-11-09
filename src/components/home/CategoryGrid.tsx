import Image from "next/image";
import Link from "next/link";
import { assetUrl, type Category } from "@/lib/site";
import SectionHeading from "./SectionHeading";

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <SectionHeading eyebrow="Our range" title="Shop by Category" link={{ href: "/shop", label: "View all" }} />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/shop?category=${category.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-neutral-200 shadow-sm ring-2 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-brand focus-visible:ring-ink motion-reduce:transition-none motion-reduce:transform-none"
            >
              {category.image ? (
                <Image
                  src={assetUrl(category.image)}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 300px, (min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:transform-none"
                />
              ) : (
                <span className="absolute inset-0 bg-brand" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity duration-300 group-hover:from-black/85" />
              <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <span className="block font-display text-lg font-semibold text-white sm:text-xl">{category.name}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-white/80 transition-colors group-hover:text-brand sm:text-sm">
                  Shop now <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:transform-none">→</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
