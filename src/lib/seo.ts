import type { Metadata } from "next";
import { SITE } from "./site";

/**
 * Open Graph for a page. Next.js replaces (not merges) the root `openGraph` when a page sets
 * its own, so every page builds the full object from these defaults.
 */
export function openGraph(page: { title?: string; url?: string; description?: string; images?: string[] }): Metadata["openGraph"] {
  return {
    siteName: SITE.name,
    type: "website",
    locale: "en_IN",
    title: page.title ?? SITE.name,
    description: page.description,
    url: page.url,
    images: page.images?.length ? page.images : [{ url: SITE.ogImage, width: 512, height: 512, alt: SITE.name }],
  };
}
