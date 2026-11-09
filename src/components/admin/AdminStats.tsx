"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { useAdminApi } from "./useAdminApi";

export interface Stats {
  products: number;
  activeProducts: number;
  outOfStock: number;
  categories: number;
  subcategories: number;
  orders: number;
  toVerify: number;
  pendingOrders: number;
  toShip: number;
  revenue: number;
  users: number;
  recentOrders: Order[];
}

interface Ctx {
  stats: Stats | null;
  error: string | null;
  loading: boolean;
  refresh(): Promise<void>;
}

const AdminStatsContext = createContext<Ctx | null>(null);

/** Dashboard numbers shared by the sidebar badges, the bell and the dashboard. Refreshes every minute. */
export function AdminStatsProvider({ children }: { children: React.ReactNode }) {
  const api = useAdminApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await api<Stats>("/api/admin/stats");
    setLoading(false);
    if (r.ok) {
      setStats(r.data);
      setError(null);
    } else setError(r.error);
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await api<Stats>("/api/admin/stats");
      if (cancelled) return;
      if (r.ok) {
        setStats(r.data);
        setError(null);
      } else setError(r.error);
    };
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [api]);

  return <AdminStatsContext.Provider value={{ stats, error, loading, refresh }}>{children}</AdminStatsContext.Provider>;
}

export function useAdminStats(): Ctx {
  const ctx = useContext(AdminStatsContext);
  if (!ctx) throw new Error("useAdminStats must be used inside <AdminStatsProvider>");
  return ctx;
}
