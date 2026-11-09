import Image from "next/image";
import Link from "next/link";
import { assetUrl, SITE } from "@/lib/site";

export default function AboutSection({ storeName, logo }: { storeName: string; logo: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <div className="grid items-center gap-8 rounded-2xl border border-black/10 p-6 sm:p-10 md:grid-cols-[220px_1fr] md:gap-12">
        <Image
          src={assetUrl(logo)}
          alt={`${storeName} logo`}
          width={220}
          height={220}
          className="mx-auto h-36 w-36 object-contain sm:h-48 sm:w-48 md:h-[220px] md:w-[220px]"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Our Story</p>
          <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            Pure goodness, naturally
          </h2>
          <p className="mt-4 leading-relaxed text-ink/80">{SITE.description}</p>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink/60">We make</dt>
              <dd className="font-display text-lg font-semibold">Atta · Besan · Sattu</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink/60">Based in</dt>
              <dd className="font-display text-lg font-semibold">Burdwan, West Bengal</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-ink/60">FSSAI Lic. No.</dt>
              <dd className="font-display text-lg font-semibold">{SITE.fssai}</dd>
            </div>
          </dl>
          <Link href="/about" className="mt-6 inline-block text-sm font-semibold underline hover:text-accent">
            Read our story →
          </Link>
        </div>
      </div>
    </section>
  );
}
