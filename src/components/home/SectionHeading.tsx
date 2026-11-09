import Link from "next/link";
import { ArrowRightIcon } from "@/components/layout/Icons";

export default function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow?: string;
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="group flex shrink-0 items-center gap-1 text-sm font-semibold transition-colors hover:text-accent">
          {link.label} <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:transform-none" />
        </Link>
      )}
    </div>
  );
}
