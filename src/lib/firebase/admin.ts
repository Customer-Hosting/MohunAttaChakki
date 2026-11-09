import "server-only";
import { getUserByUid } from "../data/users";
import { getAdminEmails, requireEnv } from "../env";
import type { UserDoc } from "../types";
import { verifyFirebaseIdToken, type VerifiedIdToken } from "./verify-token";

/** Firebase project the ID tokens must be issued for. */
function getProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
}

/** Local testing only: accept the Auth Emulator's unsigned tokens when this is set. */
function isAuthEmulator(): boolean {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) return false;
  if (process.env.VERCEL) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must never be set on Vercel.");
  }
  return true;
}

export interface AuthUser {
  uid: string;
  email: string;
  name: string | null;
}

function toAuthUser(token: VerifiedIdToken): AuthUser {
  return {
    uid: token.uid,
    email: (token.email ?? "").toLowerCase(),
    name: token.name ?? null,
  };
}

/** True when the email is listed in the server-side ADMIN_EMAILS variable. */
export function isAdminEmail(email: string): boolean {
  return email !== "" && getAdminEmails().includes(email.toLowerCase());
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header.
 * Returns null when the header is missing or the token is invalid/expired.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) return null;
  try {
    const decoded = await verifyFirebaseIdToken(match[1], getProjectId(), { emulator: isAuthEmulator() });
    return toAuthUser(decoded);
  } catch (error) {
    console.warn("Rejected Firebase ID token:", error instanceof Error ? error.message : error);
    return null;
  }
}

type AuthResult = { user: AuthUser; error?: never } | { user?: never; error: Response };
type AdminResult =
  | { user: AuthUser; profile: UserDoc; error?: never }
  | { user?: never; profile?: never; error: Response };

/** Use in Route Handlers: `const { user, error } = await requireUser(req); if (error) return error;` */
export async function requireUser(request: Request): Promise<AuthResult> {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: Response.json({ error: "Please log in to continue." }, { status: 401 }) };
  }
  return { user };
}

/**
 * Server-side admin check — never rely on client-side checks alone.
 * Requires BOTH: role "admin" in MongoDB AND the email still listed in ADMIN_EMAILS,
 * so removing an email from ADMIN_EMAILS revokes access immediately.
 */
export async function requireAdmin(request: Request): Promise<AdminResult> {
  const result = await requireUser(request);
  if (result.error) return result;
  const profile = await getUserByUid(result.user.uid);
  if (!profile || profile.role !== "admin" || !isAdminEmail(result.user.email)) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: result.user, profile };
}
