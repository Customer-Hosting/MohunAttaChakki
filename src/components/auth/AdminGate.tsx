"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminLoginForm from "./AdminLoginForm";
import { displayEmail } from "@/lib/validation";
import { useAuth } from "./AuthProvider";

type Access = "checking" | "allowed" | "denied" | "error";

/**
 * Admin area wrapper: shows the admin login form, an access-denied message, or the admin UI.
 * Hiding the UI is a convenience only — the real protection is requireAdmin() on every
 * /api/admin/* route, which this component asks for a decision.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { status, user, profile, profileError, authFetch, logOut } = useAuth();
  // Keyed by uid so switching accounts always triggers a fresh server check.
  const [result, setResult] = useState<{ uid: string; access: Access } | null>(null);
  const access: Access = user && result?.uid === user.uid ? result.access : "checking";

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    const uid = user.uid;
    authFetch("/api/admin/me")
      .then((res) => {
        const decision: Access = res.ok ? "allowed" : res.status === 401 || res.status === 403 ? "denied" : "error";
        if (!cancelled) setResult({ uid, access: decision });
      })
      .catch(() => {
        if (!cancelled) setResult({ uid, access: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [status, user, authFetch]);

  if (status === "loading" || (status === "authenticated" && access === "checking")) {
    return <p className="flex min-h-screen items-center justify-center text-sm text-ink/60">Checking access…</p>;
  }

  if (status === "unauthenticated") return <AdminLoginForm />;

  if (access === "denied" || access === "error") {
    const denied = access === "denied";
    return (
      <section className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">{denied ? "Access denied" : "Something went wrong"}</h1>
          <p className="mt-2 text-ink/70">
            {denied
              ? `${displayEmail(user?.email) || "This account"} does not have admin access.`
              : profileError ?? "Could not verify admin access. Please refresh the page."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => logOut()}
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent"
            >
              Log out & use another account
            </button>
            <Link href="/" className="rounded-full border border-black/20 px-6 py-3 text-sm font-semibold hover:bg-black/5">
              Back to store
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <AdminShell email={profile?.email} onLogout={() => logOut()}>
      {children}
    </AdminShell>
  );
}
