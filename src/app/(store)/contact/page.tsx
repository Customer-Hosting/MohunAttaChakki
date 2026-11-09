import type { Metadata } from "next";
import ContactForm from "@/components/layout/ContactForm";
import { mapsHref, phoneHref, whatsappHref } from "@/components/layout/contact";
import { ChatIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, YoutubeIcon } from "@/components/layout/Icons";
import PageHeader from "@/components/layout/PageHeader";
import { getStoreSettings } from "@/lib/catalog";
import { openGraph } from "@/lib/seo";
import headerImage from "../../../../public/images/page-header.jpg";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Mohan Atta Chakki, Sasan Para, Talit, Burdwan — phone / WhatsApp +91 97348 61080, email khandelwal.nilay@zohomail.com.",
  alternates: { canonical: "/contact" },
  openGraph: openGraph({ title: "Contact Mohan Atta Chakki", url: "/contact" }),
};

const card =
  "group flex items-start gap-4 rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-ink/30 hover:shadow-lg motion-reduce:hover:translate-y-0";
const iconWrap = "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand transition-transform duration-200 group-hover:scale-110";

export default async function ContactPage() {
  const s = await getStoreSettings();
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(s.address)}&z=16&output=embed`;

  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact Us" text="Have a question or need help? Send us a message and we will get back to you soon." image={headerImage} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.phone && (
            <li>
              <a href={phoneHref(s.phone)} className={card}>
                <span className={iconWrap}>
                  <PhoneIcon />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-ink/60">Call us</span>
                  <span className="font-semibold group-hover:text-accent">{s.phone}</span>
                </span>
              </a>
            </li>
          )}
          {s.phone && (
            <li>
              <a href={whatsappHref(s.phone)} target="_blank" rel="noopener noreferrer" className={card}>
                <span className={iconWrap}>
                  <ChatIcon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-ink/60">WhatsApp</span>
                  <span className="font-semibold group-hover:text-accent">{s.phone}</span>
                </span>
              </a>
            </li>
          )}
          {s.email && (
            <li>
              <a href={`mailto:${s.email}`} className={card}>
                <span className={iconWrap}>
                  <MailIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-ink/60">Email</span>
                  <span className="block text-sm font-semibold [overflow-wrap:anywhere] group-hover:text-accent xl:text-base">{s.email}</span>
                </span>
              </a>
            </li>
          )}
          {s.address && (
            <li>
              <a href={mapsHref(s.address)} target="_blank" rel="noopener noreferrer" className={card}>
                <span className={iconWrap}>
                  <PinIcon />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-ink/60">Visit the shop</span>
                  <span className="text-sm font-semibold group-hover:text-accent">{s.address}</span>
                </span>
              </a>
            </li>
          )}
        </ul>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-5 sm:p-8">
            <ContactForm phone={s.phone} email={s.email} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-black/10 bg-neutral-100">
              <iframe
                title={`Map showing ${s.storeName}, ${s.address}`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <div className="flex gap-3">
              {s.instagram && (
                <a
                  href={s.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-white motion-reduce:hover:translate-y-0"
                >
                  <InstagramIcon /> Instagram
                </a>
              )}
              {s.facebook && (
                <a
                  href={s.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-white motion-reduce:hover:translate-y-0"
                >
                  <FacebookIcon /> Facebook
                </a>
              )}
              {s.youtube && (
                <a
                  href={s.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-white motion-reduce:hover:translate-y-0"
                >
                  <YoutubeIcon /> YouTube
                </a>
              )}
            </div>
            {s.gstNumber && <p className="text-center text-xs text-ink/50">GSTIN: {s.gstNumber}</p>}
          </div>
        </div>
      </section>
    </>
  );
}
