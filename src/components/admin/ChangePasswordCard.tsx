"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import PasswordInput from "@/components/auth/PasswordInput";
import { authErrorMessage } from "@/lib/auth-errors";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { Alert, btnPrimary, Card, inputClass } from "./ui";

/** Lets the signed-in admin change their own Firebase password (current password required). */
export default function ChangePasswordCard() {
  const { user, changePassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    const current = String(data.get("currentPassword") ?? "");
    const next = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");

    if (!current) return setMessage({ kind: "error", text: "Please enter your current password." });
    if (next.length < MIN_PASSWORD_LENGTH) {
      return setMessage({ kind: "error", text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (next !== confirm) return setMessage({ kind: "error", text: "The new passwords don't match." });
    if (next === current) return setMessage({ kind: "error", text: "The new password must be different from the current one." });

    setBusy(true);
    setMessage(null);
    try {
      await changePassword(current, next);
      formEl.reset();
      setMessage({ kind: "success", text: "Password changed. Use the new password next time you log in." });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
      const wrongCurrent = code === "auth/invalid-credential" || code === "auth/wrong-password";
      setMessage({ kind: "error", text: wrongCurrent ? "Your current password is incorrect." : authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-5 max-w-xl">
      <h2 className="font-display text-lg font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-ink/60">
        For {user?.email ?? "your account"}. You stay logged in on this device.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        {/* Lets password managers link the change to the right account. */}
        <input type="email" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
        <label className="block text-sm font-medium">
          Current password
          <PasswordInput name="currentPassword" autoComplete="current-password" required className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          New password
          <PasswordInput name="newPassword" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Confirm new password
          <PasswordInput name="confirmPassword" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
        </label>
        <p className="text-xs text-ink/60">At least {MIN_PASSWORD_LENGTH} characters.</p>
        <div aria-live="polite">{message && <Alert kind={message.kind}>{message.text}</Alert>}</div>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3 sm:w-auto sm:px-10`}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </form>
    </Card>
  );
}
