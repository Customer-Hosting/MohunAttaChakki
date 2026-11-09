import "server-only";
import { createPublicKey, verify, type JsonWebKey, type KeyObject } from "node:crypto";

/*
 * Verifies Firebase Auth ID tokens with Node's built-in crypto, following
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * This replaces firebase-admin's verifyIdToken(): on Vercel, Next.js (Turbopack) fails to load
 * firebase-admin as an external module ("Failed to load external module firebase-admin-<hash>"),
 * which crashed every route that checks the login.
 */

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const CLOCK_SKEW_SECONDS = 300;
const DEFAULT_KEY_TTL_MS = 60 * 60 * 1000;
const MIN_REFETCH_INTERVAL_MS = 30 * 1000;

export interface VerifiedIdToken {
  uid: string;
  email?: string;
  name?: string;
}

interface TokenHeader {
  alg?: string;
  kid?: string;
}

interface TokenPayload {
  aud?: unknown;
  iss?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  auth_time?: unknown;
  email?: unknown;
  name?: unknown;
}

// Google's signing keys, cached per server instance for as long as Google's Cache-Control allows.
const keyCache: { keys: Map<string, KeyObject>; expiresAt: number; fetchedAt: number; pending?: Promise<void> } = {
  keys: new Map(),
  expiresAt: 0,
  fetchedAt: 0,
};

async function fetchKeys(): Promise<void> {
  const res = await fetch(JWKS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not fetch Firebase signing keys (HTTP ${res.status})`);
  const body = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    if (typeof jwk.kid === "string") keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
  }
  if (keys.size === 0) throw new Error("Firebase signing keys response contained no keys");

  const maxAge = Number(res.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1]);
  const now = Date.now();
  keyCache.keys = keys;
  keyCache.fetchedAt = now;
  keyCache.expiresAt = now + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge * 1000 : DEFAULT_KEY_TTL_MS);
}

async function getSigningKey(kid: string): Promise<KeyObject | undefined> {
  const now = Date.now();
  const stale = now >= keyCache.expiresAt;
  // Unknown kid: Google may have rotated keys, so refetch (throttled to avoid hammering on bad tokens).
  const unknown = !keyCache.keys.has(kid) && now - keyCache.fetchedAt >= MIN_REFETCH_INTERVAL_MS;
  if (stale || unknown) {
    keyCache.pending ??= fetchKeys().finally(() => {
      keyCache.pending = undefined;
    });
    try {
      await keyCache.pending;
    } catch (error) {
      // Keep using still-valid cached keys if a refresh fails; otherwise surface the error.
      if (stale) throw error;
    }
  }
  return keyCache.keys.get(kid);
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

/**
 * Returns the verified token's identity, or throws when the token is malformed, unsigned,
 * signed by an unknown key, expired, or issued for another Firebase project.
 */
export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  { emulator = false }: { emulator?: boolean } = {},
): Promise<VerifiedIdToken> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeSegment<TokenHeader>(headerB64);
  const payload = decodeSegment<TokenPayload>(payloadB64);

  // The Auth Emulator issues unsigned tokens; they are only accepted in local emulator mode.
  if (!emulator) {
    if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("Unexpected ID token algorithm");
    const key = await getSigningKey(header.kid);
    if (!key) throw new Error("ID token signed by an unknown key");
    const valid = verify(
      "RSA-SHA256",
      Buffer.from(`${headerB64}.${payloadB64}`),
      key,
      Buffer.from(signatureB64, "base64url"),
    );
    if (!valid) throw new Error("Invalid ID token signature");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("ID token has the wrong audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("ID token has the wrong issuer");
  if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error("ID token has an invalid subject");
  }
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("ID token has expired");
  if (typeof payload.iat !== "number" || payload.iat > now + CLOCK_SKEW_SECONDS) throw new Error("ID token issued in the future");
  if (typeof payload.auth_time !== "number" || payload.auth_time > now + CLOCK_SKEW_SECONDS) {
    throw new Error("ID token has an invalid auth time");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}
