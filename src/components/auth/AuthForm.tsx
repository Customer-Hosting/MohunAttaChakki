"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import {
  cleanName,
  isPhoneLoginEmail,
  MIN_PASSWORD_LENGTH,
  normalizePhone,
  phoneLoginEmail,
  safeRedirect,
} from "@/lib/validation";
import { useAuth } from "./AuthProvider";
import PasswordInput from "./PasswordInput";

type Mode = "login" | "signup" | "forgot";

const EMAIL_PATTERN = /^[^s@]+@[^s@]+.[^s@]+$/;

/**
 * The login field accepts an email or a mobile number. Returns the Firebase login ID to use, or
 * null when it is neither a plausible email nor a valid 10-digit mobile number.
 */
function loginIdFrom(value: string): string | null {
  if (value.includes("@")) return EMAIL_PATTERN.test(value) ? value : null;
  const phone = normalizePhone(value);
  return phone ? phoneLoginEmail(phone) : null;
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-black/20 px-3 py-2.5 text-base outline-none focus:border-ink focus:ring-2 focus:ring-brand";

/** Red star after a required field's label. Hidden from screen readers: the input's `required` already says it. */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-600">
      *
    </span>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirect(searchParams.get("next"));
  const initialMode = searchParams.get("mode");
  const { status, profile, profileError, signUp, logIn, logOut, resetPassword, retryProfile } = useAuth();

  const [mode, setMode] = useState<Mode>(
    initialMode === "signup" || initialMode === "forgot" ? initialMode : "login",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setError(null);
    setNotice(null);
    // Firebase login ID: the email, or (no email) the internal ID made from the mobile number.
    let loginId = email;

    if (mode === "signup") {
      const name = cleanName(form.get("name"));
      const phone = normalizePhone(form.get("phone"));
      if (!name) return setError("Please enter your name (2–80 characters).");
      if (!phone) return setError("Please enter a valid 10-digit mobile number.");
      // Email is optional. Without one, the customer logs in with their mobile number.
      if (email && (!EMAIL_PATTERN.test(email) || isPhoneLoginEmail(email))) return setError("Please enter a valid email address, or leave it empty.");
      loginId = email || phoneLoginEmail(phone);
      if (password.length < MIN_PASSWORD_LENGTH)
        return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      if (!form.get("confirmPassword")) return setError("Please confirm your password.");
      if (password !== form.get("confirmPassword")) return setError("Passwords do not match.");
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp({
          name: cleanName(form.get("name"))!,
          phone: normalizePhone(form.get("phone"))!,
          email: loginId,
          password,
        });
        router.replace(next);
      } else if (mode === "login") {
        const id = loginIdFrom(email);
        if (!id) {
          setBusy(false);
          return setError("Please enter your email or 10-digit mobile number.");
        }
        await logIn(id, password);
        router.replace(next);
      } else {
        if (!email.includes("@")) {
          setBusy(false);
          return setError(
            "Password reset links are sent by email. If you signed up with only your mobile number, please contact us to reset your password.",
          );
        }
        await resetPassword(email);
        // Same message whether or not the account exists (avoids revealing registered emails).
        setNotice("If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.");
      }
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
      if (mode === "signup" && !email && code === "auth/email-already-in-use") {
        setError("An account with this mobile number already exists. Please log in with your mobile number instead.");
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  if (status === "authenticated" && !busy) {
    return (
      <div className="text-center">
        <p className="text-ink/80">
          You are logged in as <strong>{profile?.name ?? "your account"}</strong>.
        </p>
        {profileError && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {profileError}{" "}
            <button type="button" onClick={() => retryProfile()} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={next}
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark"
          >
            Continue
          </Link>
          <button
            type="button"
            onClick={() => logOut()}
            className="rounded-full border border-black/20 px-6 py-3 text-sm font-semibold hover:bg-black/5"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  const title = { login: "Log in", signup: "Create account", forgot: "Reset password" }[mode];

  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-ink/70">
        {mode === "login" && "Log in to use your wishlist and place orders."}
        {mode === "signup" && "Create an account to save items and place orders."}
        {mode === "forgot" && "Enter the email you signed up with and we will send you a reset link."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {mode === "signup" && (
          <>
            <p className="text-xs text-ink/60">
              Fields marked <span className="text-red-600">*</span> are required.
            </p>
            <label className="block text-sm font-medium">
              Full name
              <RequiredMark />
              <input name="name" type="text" autoComplete="name" required maxLength={80} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Mobile number
              <RequiredMark />
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                required
                maxLength={14}
                className={inputClass}
              />
            </label>
          </>
        )}

        {mode === "signup" && (
          <label className="block text-sm font-medium">
            Email <span className="font-normal text-ink/50">(optional)</span>
            <input name="email" type="email" autoComplete="email" className={inputClass} />
            <span className="mt-1 block text-xs font-normal text-ink/60">
              Without an email you log in with your mobile number. An email lets you reset a forgotten password yourself.
            </span>
          </label>
        )}
        {mode === "login" && (
          <label className="block text-sm font-medium">
            Email or mobile number
            <input name="email" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required className={inputClass} />
          </label>
        )}
        {mode === "forgot" && (
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </label>
        )}

        {mode !== "forgot" && (
          <label className="block text-sm font-medium">
            Password
            {mode === "signup" && <RequiredMark />}
            <PasswordInput
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
              className={inputClass}
            />
          </label>
        )}

        {mode === "signup" && (
          <label className="block text-sm font-medium">
            Confirm password
            <RequiredMark />
            <PasswordInput name="confirmPassword" autoComplete="new-password" required className={inputClass} />
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
          disabled={busy || status === "loading"}
          className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : { login: "Log in", signup: "Create account", forgot: "Send reset link" }[mode]}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        {mode === "login" && (
          <>
            <button type="button" onClick={() => switchMode("forgot")} className="text-ink/70 underline hover:text-accent">
              Forgot password?
            </button>
            <p>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-semibold underline hover:text-accent">
                Create an account
              </button>
            </p>
          </>
        )}
        {mode !== "login" && (
          <p>
            {mode === "signup" ? "Already have an account? " : "Remembered it? "}
            <button type="button" onClick={() => switchMode("login")} className="font-semibold underline hover:text-accent">
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
