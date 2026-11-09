import "server-only";

/**
 * Reads a required server-side environment variable.
 * Called lazily (at request time) so `next build` works without secrets present.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Lower-cased admin emails from ADMIN_EMAILS (comma-separated). */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
