"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number; data?: unknown };

/** fetch() for /api/admin/* with the admin's ID token; never throws. */
export function useAdminApi() {
  const { authFetch } = useAuth();
  return useCallback(
    async <T,>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> => {
      const { json, ...rest } = init;
      try {
        const res = await authFetch(path, {
          ...rest,
          headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
          body: json !== undefined ? JSON.stringify(json) : rest.body,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || `Request failed (${res.status}).`, status: res.status, data };
        return { ok: true, data: data as T };
      } catch {
        return { ok: false, error: "Network error. Please check your connection.", status: 0 };
      }
    },
    [authFetch],
  );
}
