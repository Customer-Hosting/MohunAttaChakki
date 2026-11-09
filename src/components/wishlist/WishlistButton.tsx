"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/layout/Icons";
import { useWishlist } from "./WishlistProvider";

/**
 * Heart toggle. Logged-out visitors are sent to login/signup (handled by the provider).
 * `variant="full"` is the labelled button used on the product page.
 */
export default function WishlistButton({
  productId,
  productName,
  variant = "icon",
}: {
  productId: string;
  productName: string;
  variant?: "icon" | "full";
}) {
  const { has, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const saved = has(productId);

  const onClick = async () => {
    setBusy(true);
    await toggle(productId);
    setBusy(false);
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        disabled={busy}
        onClick={onClick}
        className={`flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
          saved ? "border-accent text-accent" : "border-black/20 hover:border-ink"
        }`}
      >
        <HeartIcon className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        {saved ? "Saved to Wishlist" : "Add to Wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}
      disabled={busy}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:scale-110 hover:text-accent hover:shadow-md active:scale-95 disabled:opacity-60 motion-reduce:hover:scale-100 ${
        saved ? "text-accent" : "text-ink"
      }`}
    >
      <HeartIcon className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
