"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Slide {
  image: StaticImageData;
  alt: string;
  href: string;
}

const INTERVAL_MS = 3000;

/**
 * Lightweight automatic slider (no carousel library).
 * - Cross-fades every 3 s (loops); pauses on hover / keyboard focus and when the tab is hidden.
 * - No auto-play for visitors who prefer reduced motion.
 * - Fixed aspect ratio (no layout shift); the first slide is preloaded.
 */
export default function HeroSlider({ slides, label }: { slides: Slide[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = slides.length;
  const regionRef = useRef<HTMLElement>(null);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (count === 0) return null;
  const autoplay = count > 1 && !paused && !reducedMotion;

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label={label}
      className="mx-auto max-w-7xl px-0 sm:px-4 sm:pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="relative aspect-[1691/930] overflow-hidden bg-neutral-900 sm:rounded-2xl">
        {/* Live region announces slide changes only when the visitor changes slides themselves. */}
        <div aria-live={autoplay ? "off" : "polite"} className="group/slides h-full">
          {slides.map((slide, i) => (
            <Link
              key={slide.href + i}
              href={slide.href}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${slide.alt}`}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={i === 0}
                placeholder="blur"
                sizes="(min-width: 1280px) 1248px, 100vw"
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover/slides:scale-[1.02] motion-reduce:transform-none"
              />
            </Link>
          ))}
        </div>

      </div>

      {count > 1 && (
      <div className="mt-2 flex justify-center gap-1" role="group" aria-label="Choose slide">
        {slides.map((slide, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className="grid h-6 w-6 place-items-center"
          >
            <span className={`block h-2 rounded-full transition-all ${i === index ? "w-6 bg-ink" : "w-2 bg-ink/25"}`} />
          </button>
        ))}
      </div>
      )}
    </section>
  );
}
