"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LoginLink from "@/components/auth/LoginLink";
import type { WishlistItem } from "@/lib/types";
import WishlistCard from "./WishlistCard";
import { useWishlist } from "./WishlistProvider";

type Loaded = { uid: string; items: WishlistItem[] } | { uid: string; error: string };

export default function WishlistView() {
  const { status, user, authFetch } = useAuth();
  const { toggle, error: toggleError } = useWishlist();
  // Keyed by uid so another account never sees a previous account's list.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = user && loaded?.uid === user.uid ? loaded : null;

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    const uid = user.uid;
    authFetch("/api/wishlist?include=products")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load your wishlist.");
        if (!cancelled) setLoaded({ uid, items: data.items as WishlistItem[] });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ uid, error: err instanceof Error ? err.message : "Could not load your wishlist." });
      });
    return () => {
      cancelled = true;
    };
  }, [status, user, authFetch, attempt]);

  const remove = useCallback(
    async (productId: string) => {
      if (!(await toggle(productId))) return;
      setLoaded((prev) => (prev && "items" in prev ? { ...prev, items: prev.items.filter((i) => i.product.id !== productId) } : prev));
    },
    [toggle],
  );

  if (status === "unauthenticated") {
    return (
      <Box>
        <p className="font-display text-xl font-semibold">Please login to view your wishlist.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">Save products you like and come back to them any time.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LoginLink className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent">Log in</LoginLink>
          <LoginLink mode="signup" className="rounded-full border border-black/20 px-6 py-3 text-sm font-semibold hover:border-ink">
            Create account
          </LoginLink>
        </div>
      </Box>
    );
  }

  if (status === "loading" || !current) return <WishlistSkeleton />;

  if ("error" in current) {
    return (
      <Box>
        <p className="font-display text-xl font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-ink/70">{current.error}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark"
        >
          Try again
        </button>
      </Box>
    );
  }

  if (current.items.length === 0) {
    return (
      <Box>
        <p className="font-display text-xl font-semibold">Your wishlist is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark">
          Browse the shop
        </Link>
      </Box>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-ink/70">
        {current.items.length === 1 ? "1 saved item" : `${current.items.length} saved items`}
      </p>
      {toggleError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {toggleError}
        </p>
      )}
      <ul className="grid gap-4 lg:grid-cols-2">
        {current.items.map((item) => (
          <WishlistCard key={item.product.id} item={item} onRemove={remove} />
        ))}
      </ul>
    </>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">{children}</div>;
}

function WishlistSkeleton() {
  return (
    <ul className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <li key={i} className="flex gap-4 rounded-2xl border border-black/10 p-4">
          <div className="aspect-[4/5] w-24 rounded-xl bg-neutral-100 sm:w-32" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-neutral-100" />
            <div className="h-4 w-1/4 rounded bg-neutral-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
