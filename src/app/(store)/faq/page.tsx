import type { Metadata } from "next";
import Link from "next/link";
import { faq } from "@/content/en";
import PageHeader from "@/components/layout/PageHeader";
import { getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { openGraph } from "@/lib/seo";
import headerImage from "../../../../public/images/page-header.jpg";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about our chakki atta, besan and sattu, ordering, UPI payment, delivery and damaged-pack replacement at Mohan Atta Chakki, Burdwan.",
  alternates: { canonical: "/faq" },
  openGraph: openGraph({ title: "FAQ | Mohan Atta Chakki", url: "/faq" }),
};

export default async function FaqPage() {
  const settings = await getStoreSettings();
  const items = faq.map((item) => ({
    q: item.q,
    a: item.a.replace("{shipping}", formatPrice(settings.shippingCharge)).replace("{delivery}", settings.deliveryEstimate),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };

  return (
    <>
      <PageHeader eyebrow="Help" title="Frequently Asked Questions" text="Ordering, payment, delivery and replacements, all in one place." image={headerImage} />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={item.q}>
              <details
                className="group rounded-2xl border border-black/10 bg-white transition-all duration-200 hover:border-ink/40 hover:shadow-md open:border-ink/40 open:shadow-md"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-lg transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-ink/75">{item.a}</p>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-2xl bg-neutral-50 p-6 text-center">
          <p className="font-display text-lg font-semibold">Still have a question?</p>
          <p className="mt-1 text-sm text-ink/70">We are happy to help.</p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-lg motion-reduce:hover:translate-y-0"
          >
            Contact us
          </Link>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
