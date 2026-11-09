import type { Metadata } from "next";
import WishlistView from "@/components/wishlist/WishlistView";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

// The list is per-user, so it loads in the browser after Firebase restores the session.
export default function WishlistPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Wishlist</h1>
      <WishlistView />
    </section>
  );
}
