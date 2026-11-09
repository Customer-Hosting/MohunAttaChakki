import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" badge shown during `npm run dev` (it also shows "Cache disabled" whenever
  // the browser DevTools "Disable cache" option is on). Build/runtime errors still pop up as usual.
  // Development only: the live site never shows it.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // AVIF is ~20–30% smaller than WebP; browsers without AVIF support get WebP automatically.
    formats: ["image/avif", "image/webp"],
    // Keep optimised images for 7 days instead of the 4-hour default, so they are not re-encoded
    // all the time. Uploaded images get a new URL when replaced, so they never show stale copies.
    minimumCacheTTL: 604800,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
