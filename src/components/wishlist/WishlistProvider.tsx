"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

interface WishlistContextValue {
  ids: Set<string>;
  has(productId: string): boolean;
  /** Logged out → goes to login. Logged in → adds/removes (optimistic). Resolves true on success. */
  toggle(productId: string): Promise<boolean>;
  error: string | null;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status, user, authFetch } = useAuth();
  const router = useRouter();
  // Keyed by uid so a different account never sees the previous account's list.
  const [state, setState] = useState<{ uid: string; ids: Set<string> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = useMemo(() => (user && state?.uid === user.uid ? state.ids : new Set<string>()), [user, state]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    const uid = user.uid;
    authFetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : { productIds: [] }))
      .then((data) => {
        if (!cancelled) setState({ uid, ids: new Set(data.productIds as string[]) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, user, authFetch]);

  const toggle = useCallback(
    async (productId: string): Promise<boolean> => {
      if (status !== "authenticated" || !user) {
        // Read at click time (no usePathname) so the app shell can stay prerendered.
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return false;
      }
      const uid = user.uid;
      const adding = !ids.has(productId);
      const optimistic = new Set(ids);
      if (adding) optimistic.add(productId);
      else optimistic.delete(productId);
      setState({ uid, ids: optimistic });
      setError(null);
      try {
        const res = await authFetch("/api/wishlist", {
          method: adding ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not update your wishlist.");
        setState({ uid, ids: new Set(data.productIds as string[]) });
        return true;
      } catch (err) {
        setState({ uid, ids }); // roll back
        setError(err instanceof Error ? err.message : "Could not update your wishlist.");
        return false;
      }
    },
    [status, user, ids, authFetch, router],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({ ids, has: (id) => ids.has(id), toggle, error }),
    [ids, toggle, error],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
