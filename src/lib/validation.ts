// Shared by the signup form and the server so both apply the same rules.

/** Trims and collapses spaces. Returns null if not 2–80 characters. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 80 ? name : null;
}

/** Accepts Indian mobile numbers (optionally +91 / 0 prefixed). Returns 10 digits or null. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[\s()-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const MIN_PASSWORD_LENGTH = 6; // Firebase's minimum

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeRedirect(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Phone-number login (customers who sign up without an email)
// ---------------------------------------------------------------------------
// Firebase email/password login needs an email, so a customer who leaves the email empty gets an
// internal login ID made from their mobile number, e.g. 9876543210@phone.mohanattachakki-1e3af.firebaseapp.com.
// The domain belongs to this Firebase project, so no message can ever go to someone else's inbox.
// The internal ID is never shown or stored as the customer's email (it is saved as "").
// NEVER change this value: existing phone-only customers log in with it.
export const PHONE_LOGIN_DOMAIN = "phone.mohanattachakki-1e3af.firebaseapp.com";

/** The internal Firebase login ID for a 10-digit mobile number. */
export function phoneLoginEmail(phone: string): string {
  return `${phone}@${PHONE_LOGIN_DOMAIN}`;
}

/** True for internal phone-login IDs (not a real email address). */
export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${PHONE_LOGIN_DOMAIN}`);
}

/** The 10-digit mobile number inside an internal phone-login ID, or null. */
export function phoneFromLoginEmail(email: string | null | undefined): string | null {
  if (!isPhoneLoginEmail(email)) return null;
  const local = email!.split("@")[0];
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/** A real email address for display/contact: "" for internal phone-login IDs. */
export function displayEmail(email: string | null | undefined): string {
  return email && !isPhoneLoginEmail(email) ? email : "";
}
