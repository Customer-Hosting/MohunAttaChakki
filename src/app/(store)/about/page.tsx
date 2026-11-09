import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { content } from "@/content/en";
import { mapsHref, phoneHref, whatsappHref } from "@/components/layout/contact";
import { ChatIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, YoutubeIcon } from "@/components/layout/Icons";
import PageHeader from "@/components/layout/PageHeader";
import { getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { openGraph } from "@/lib/seo";
import { assetUrl, SITE } from "@/lib/site";
import headerImage from "../../../../public/images/page-header.jpg";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Mohan Atta Chakki, Burdwan — chakki fresh atta, besan and sattu ground and packed fresh, plus all types of pulses.",
  alternates: { canonical: "/about" },
  openGraph: openGraph({ title: "About Mohan Atta Chakki", url: "/about", images: [assetUrl(SITE.ownerImage)] }),
};

export default async function AboutPage() {
  const settings = await getStoreSettings();
  const policies = [
    { title: "Delivery", text: `${content.policies.delivery} Estimated delivery: ${settings.deliveryEstimate}.` },
    { title: "Shipping", text: `${formatPrice(settings.shippingCharge)} per order.` },
    { title: "Damaged packs", text: settings.exchangePolicy },
    { title: "Refunds", text: settings.refundPolicy },
    { title: "Cash on Delivery", text: content.policies.cod },
    { title: "Payment", text: content.policies.payment },
  ];

  return (
    <>
      {/* 1. Page header */}
      <PageHeader
        eyebrow={SITE.tagline}
        title={`About ${settings.storeName}`}
        text={`${content.audience} Based in Burdwan, West Bengal.`}
        image={headerImage}
      />

      {/* 2–4. Owner image, story, established year */}
      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
        {settings.ownerImage ? (
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-100 shadow-sm">
            <Image
              src={assetUrl(settings.ownerImage)}
              alt={`Stone chakki and fresh flours at ${settings.storeName}`}
              fill
              sizes="(min-width: 768px) 384px, 90vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Our Story</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">Freshly ground in Burdwan</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink/80">{SITE.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="rounded-xl bg-brand p-4">
              <dt className="text-xs uppercase tracking-wider text-ink/70">We make</dt>
              <dd className="font-display text-lg font-semibold leading-snug">Atta · Besan · Sattu</dd>
            </div>
            <div className="rounded-xl border border-black/10 p-4">
              <dt className="text-xs uppercase tracking-wider text-ink/70">We also sell</dt>
              <dd className="font-display text-lg font-semibold leading-snug">All types of pulses</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 5. Values */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">What we stand for</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {content.values.map((value) => (
              <li key={value.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-brand motion-reduce:transition-none motion-reduce:transform-none">
                <h3 className="font-display text-lg font-semibold">{value.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Who we serve + policies */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Shopping with us</h2>
        <p className="mt-2 text-ink/70">{content.audience}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p) => (
            <div key={p.title} className="rounded-2xl border border-black/10 p-5 transition-all duration-300 hover:border-ink/30 hover:bg-neutral-50">
              <dt className="font-semibold">{p.title}</dt>
              <dd className="mt-1 text-sm text-ink/75">{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 7–11. Contact */}
      <section id="contact" className="scroll-mt-36 bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Visit or contact us</h2>
            <address className="mt-4 not-italic leading-relaxed text-white/85">
              <span className="font-semibold text-white">{settings.storeName}</span>
              <br />
              {settings.address}
            </address>
            <a
              href={mapsHref(settings.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-brand underline"
            >
              Open in Google Maps
            </a>
            <p className="mt-4 text-sm text-white/60">FSSAI Lic. No.: {SITE.fssai}</p>
            {settings.gstNumber && <p className="mt-1 text-sm text-white/60">GSTIN: {settings.gstNumber}</p>}
          </div>
          <ul className="space-y-3">
            {settings.phone && (
              <li>
                <a href={phoneHref(settings.phone)} className="flex items-center gap-3 rounded-xl bg-white/5 p-4 hover:bg-white/10">
                  <PhoneIcon className="h-5 w-5 text-brand" />
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-white/60">Phone</span>
                    {settings.phone}
                  </span>
                </a>
              </li>
            )}
            {settings.phone && (
              <li>
                <a
                  href={whatsappHref(settings.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white/5 p-4 hover:bg-white/10"
                >
                  <ChatIcon className="h-5 w-5 text-brand" />
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-white/60">WhatsApp</span>
                    {settings.phone}
                  </span>
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 rounded-xl bg-white/5 p-4 hover:bg-white/10">
                  <MailIcon className="h-5 w-5 text-brand" />
                  <span className="break-all">
                    <span className="block text-xs uppercase tracking-wider text-white/60">Email</span>
                    {settings.email}
                  </span>
                </a>
              </li>
            )}
            <li className="flex gap-3">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 p-4 hover:bg-white/10"
                >
                  <InstagramIcon className="h-5 w-5 text-brand" /> Instagram
                </a>
              )}
              {settings.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 p-4 hover:bg-white/10"
                >
                  <FacebookIcon className="h-5 w-5 text-brand" /> Facebook
                </a>
              )}
              {settings.youtube && (
                <a
                  href={settings.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 p-4 hover:bg-white/10"
                >
                  <YoutubeIcon className="h-5 w-5 text-brand" /> YouTube
                </a>
              )}
            </li>
          </ul>
        </div>
      </section>

      {/* 12. CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 text-center sm:py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ready to stock your kitchen?</h2>
        <p className="mt-2 text-ink/70">Chakki fresh atta, besan, sattu and pulses, delivered to your door.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm font-semibold text-white hover:bg-accent">
          Visit the Shop
        </Link>
      </section>
    </>
  );
}
