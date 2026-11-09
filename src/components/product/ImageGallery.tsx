"use client";

import Image from "next/image";
import { useState } from "react";
import { assetUrl } from "@/lib/site";

/** Main image + thumbnails. No carousel library. */
export default function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100">
        {current ? (
          <Image
            src={assetUrl(current)}
            alt={images.length > 1 ? `${name} — image ${active + 1} of ${images.length}` : name}
            fill
            priority
            sizes="(min-width: 1280px) 616px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <span className="grid h-full place-items-center px-6 text-center font-display text-2xl text-ink/40">{name}</span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Product images">
          {images.map((src, index) => (
            <li key={src + index}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === active}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 ${
                  index === active ? "border-ink" : "border-transparent hover:border-black/30"
                }`}
              >
                <Image src={assetUrl(src)} alt="" fill sizes="110px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
