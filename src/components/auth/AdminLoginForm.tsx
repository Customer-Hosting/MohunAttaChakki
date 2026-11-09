"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import { SITE } from "@/lib/site";
import { useAuth } from "./AuthProvider";
import PasswordInput from "./PasswordInput";

const inputClass =
  "mt-1 block w-full rounded-lg border border-black/20 px-3 py-2.5 text-base outline-none focus:border-ink focus:ring-2 focus:ring-brand";

/** Login form shown at /admin when nobody is signed in. Admin rights are checked by the server after login. */
export default function AdminLoginForm() {
  const { logIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await logIn(email, String(form.get("password") ?? ""));
        // AdminGate takes over: it asks the server whether this account is an admin.
      } else {
        await resetPassword(email);
        setNotice("If this email has an account, a password reset link has been sent.");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src={SITE.logo} alt={SITE.name} width={72} height={72} priority className="h-[72px] w-[72px]" />
          <p className="mt-3 font-display text-lg font-semibold">{SITE.name}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-semibold">{mode === "login" ? "Admin Login" : "Reset password"}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {mode === "login" ? "Sign in to manage products, orders and settings." : "Enter the admin email to receive a reset link."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" autoComplete="username" required className={inputClass} />
            </label>
            {mode === "login" && (
              <label className="block text-sm font-medium">
                Password
                <PasswordInput name="password" autoComplete="current-password" required className={inputClass} />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Send reset link"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "forgot" : "login");
                setError(null);
                setNotice(null);
              }}
              className="text-ink/70 underline hover:text-accent"
            >
              {mode === "login" ? "Forgot password?" : "Back to login"}
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-ink/70 hover:text-accent">
            ← Back to store
          </Link>
        </p>
      </div>
    </section>
  );
}
