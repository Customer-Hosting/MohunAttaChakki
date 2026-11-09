import Image from "next/image";
import Link from "next/link";
import { content } from "@/content/en";
import promoAtta from "../../../public/images/promo-atta.jpg";
import promoBesan from "../../../public/images/promo-besan-sattu.jpg";

// Static imports give next/image the dimensions + blur placeholders (no layout shift).
const IMAGES = { "/images/promo-atta.jpg": promoAtta, "/images/promo-besan-sattu.jpg": promoBesan };

/** Two promo banners (atta + besan & sattu) shown after Featured Products. */
export default function PromoBanners() {
  return (
    <section aria-label="Our products" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <ul className="grid gap-5 lg:grid-cols-2">
        {content.promos.map((promo) => (
          <li key={promo.key}>
            <Link
              href={promo.href}
              className="group relative block aspect-[2/1] overflow-hidden rounded-2xl bg-neutral-200 shadow-sm ring-2 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-brand focus-visible:ring-ink motion-reduce:transform-none motion-reduce:transition-none sm:aspect-[2.2/1]"
            >
              <Image
                src={IMAGES[promo.image]}
                alt={promo.alt}
                fill
                placeholder="blur"
                sizes="(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw"
                className="object-cover object-right transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              />
              {/* Soft fade on the text side keeps the heading readable on every screen size. */}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 via-45% to-transparent to-65%" />
              <span className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center gap-1.5 p-4 sm:gap-2 sm:p-6">
                <span className="hidden text-[11px] font-medium uppercase leading-relaxed tracking-wide text-ink/75 xl:block">
                  {promo.eyebrow}
                </span>
                <span className="font-display text-xl font-semibold leading-tight text-ink sm:text-[1.75rem]">{promo.title}</span>
                <span className="mt-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink sm:text-sm">
                  <span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-accent">{promo.cta}</span>
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transform-none"
                  >
                    →
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
