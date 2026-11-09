import { content } from "@/content/en";
import { ChatIcon, ReturnIcon, ShieldIcon, TruckIcon } from "@/components/layout/Icons";
import { formatPrice } from "@/lib/format";

const ICONS = { india: TruckIcon, shipping: TruckIcon, delivery: TruckIcon, exchange: ReturnIcon, refund: ShieldIcon, cod: ChatIcon };

/**
 * Business information strip — auto-scrolls in a loop, pauses on hover/focus.
 * The list is rendered twice for a seamless loop; the copy is hidden from screen readers.
 * Visitors who prefer reduced motion get a static, wrapping list.
 */
export default function ValueSection({ shippingCharge, deliveryEstimate }: { shippingCharge: number; deliveryEstimate: string }) {
  const items = content.services.map((s) => ({
    ...s,
    title: s.title.replace("{shipping}", formatPrice(shippingCharge)).replace("{delivery}", deliveryEstimate),
  }));

  const list = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className={`flex shrink-0 gap-5 pr-5 motion-reduce:flex-wrap motion-reduce:justify-center ${copy ? "motion-reduce:hidden" : ""}`}>
      {items.map(({ key, title, text }) => {
        const Icon = ICONS[key as keyof typeof ICONS];
        return (
          <li
            key={key}
            className="group relative flex min-h-28 w-72 shrink-0 items-start gap-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-dark/60 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-300 group-hover:scale-x-100" />
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand shadow-sm ring-4 ring-brand/25 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:transform-none">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[1.05rem] font-semibold leading-tight">{title}</h3>
              <p className="mt-1 text-[13px] leading-snug text-ink/65">{text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="group/marquee overflow-hidden border-y border-black/5 bg-neutral-50 py-10" aria-labelledby="services-heading">
      <h2 id="services-heading" className="sr-only">
        Delivery, payment and replacement
      </h2>
      <div className="flex w-max animate-[marquee_30s_linear_infinite] group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:justify-center motion-reduce:px-4">
        {list(false)}
        {list(true)}
      </div>
    </section>
  );
}
