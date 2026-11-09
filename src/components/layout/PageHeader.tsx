import Image, { type StaticImageData } from "next/image";

/** Dark page header used by About, FAQ and Contact. */
export default function PageHeader({
  eyebrow,
  title,
  text,
  image,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  image: StaticImageData;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <Image src={image} alt="" fill priority placeholder="blur" sizes="100vw" className="-z-10 object-cover opacity-50" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        {text && <p className="mt-3 max-w-xl text-white/85">{text}</p>}
      </div>
    </section>
  );
}
