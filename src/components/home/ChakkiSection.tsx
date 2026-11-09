import Image from "next/image";
import Link from "next/link";
import basket from "../../../public/images/grocery-basket.png";

/**
 * "From our chakki" panel (takes the place of the shop video on the original design).
 * The product photo has a transparent background, so it sits directly on the dark panel.
 */
export default function ChakkiSection({ storeName }: { storeName: string }) {
  return (
    <section aria-labelledby="chakki-title" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-10 md:grid-cols-[minmax(0,1fr)_360px] md:gap-12 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="order-2 md:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">From our chakki</p>
          <h2 id="chakki-title" className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            Ground fresh at {storeName}
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-white/80">
            We grind whole wheat, chana and other grains in our own clean, hygienic chakki and pack them fresh. That is how
            our atta keeps its bran, and our besan and sattu stay pure, with no artificial colour and no added preservatives.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {["100% Pure", "Premium Quality", "Healthy Choice"].map((badge) => (
              <li key={badge} className="rounded-full border border-white/25 px-3 py-1 text-white/90">
                {badge}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white"
            >
              Shop now
            </Link>
            <Link
              href="/contact"
              className="rounded-full border-2 border-white/70 px-6 py-3 text-sm font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink"
            >
              Contact us
            </Link>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[340px] md:order-2 md:max-w-none">
          <Image
            src={basket}
            alt="Sacks of atta, besan and sattu with bowls of chana and pulses"
            sizes="(min-width: 1024px) 440px, (min-width: 768px) 360px, 340px"
            className="h-auto w-full drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
