import Image from "next/image";
import Link from "next/link";
import { content } from "@/content/en";
import { getStoreSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { assetUrl, FOOTER_LINKS, SITE } from "@/lib/site";
import { mapsHref, phoneHref, whatsappHref } from "./contact";
import { ChatIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, YoutubeIcon } from "./Icons";

const iconLink =
  "rounded-full border border-white/20 p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-ink motion-reduce:hover:translate-y-0";

export default async function Footer() {
  const s = await getStoreSettings();

  return (
    <footer className="mt-16 bg-ink text-white/80">
      <div className="h-1 bg-brand" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.3fr_1.3fr]">
        <div>
          <Image src={assetUrl(s.logo || SITE.logo)} alt={s.storeName} width={120} height={80} className="h-20 w-auto rounded-xl bg-white object-contain p-1.5" />
          <p className="mt-4 text-sm leading-relaxed">
            {content.audience} FSSAI Lic. No. {SITE.fssai}.
          </p>
          <div className="mt-5 flex gap-3">
            {s.instagram && (
              <a href={s.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={iconLink}>
                <InstagramIcon />
              </a>
            )}
            {s.facebook && (
              <a href={s.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={iconLink}>
                <FacebookIcon />
              </a>
            )}
            {s.youtube && (
              <a href={s.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={iconLink}>
                <YoutubeIcon />
              </a>
            )}
            {s.phone && (
              <a href={whatsappHref(s.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={iconLink}>
                <ChatIcon className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand">Useful links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-block transition-all duration-200 hover:translate-x-1 hover:text-brand motion-reduce:hover:translate-x-0">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand">Contact</h2>
          <address className="mt-4 space-y-3 text-sm not-italic">
            {s.address && (
              <a href={mapsHref(s.address)} target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:text-brand">
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-semibold text-white">{s.storeName}</span>
                  {s.address}
                </span>
              </a>
            )}
            {s.phone && (
              <a href={phoneHref(s.phone)} className="flex items-center gap-2 hover:text-brand">
                <PhoneIcon className="h-4 w-4 shrink-0" />
                <span>
                  {s.phone} <span className="text-white/50">(Phone / WhatsApp)</span>
                </span>
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="flex items-center gap-2 break-all hover:text-brand">
                <MailIcon className="h-4 w-4 shrink-0" />
                {s.email}
              </a>
            )}
          </address>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand">Delivery &amp; replacement</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>{content.policies.delivery}</li>
            <li>
              Shipping {formatPrice(s.shippingCharge)} · Estimated delivery {s.deliveryEstimate}
            </li>
            <li>{s.exchangePolicy}</li>
            <li>{s.refundPolicy}</li>
            <li>{content.policies.cod}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        <p>© {s.storeName}. {SITE.tagline}. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
