import "server-only";
import { ObjectId } from "mongodb";

/** Thrown for invalid input. API routes turn it into a 400 response with `message`. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Parses a 24-char hex id; returns null for anything else (never throws). */
export function toObjectId(id: unknown): ObjectId | null {
  return typeof id === "string" && ObjectId.isValid(id) && id.length === 24 ? new ObjectId(id) : null;
}

export function trimmedString(value: unknown, field: string, { min = 0, max = 200 } = {}): string {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw new ValidationError(`${field} must be text.`);
  const result = value.trim();
  if (result.length < min) throw new ValidationError(min <= 1 ? `${field} is required.` : `${field} must be at least ${min} characters.`);
  if (result.length > max) throw new ValidationError(`${field} must be at most ${max} characters.`);
  return result;
}

/** Accepts absolute https URLs or site-relative paths ("/brand/logo.png"). Empty string allowed. */
export function urlOrEmpty(value: unknown, field: string): string {
  const url = trimmedString(value, field, { max: 1000 });
  if (url === "" || (url.startsWith("/") && !url.startsWith("//"))) return url;
  try {
    if (new URL(url).protocol === "https:") return url;
  } catch {
    // fall through
  }
  throw new ValidationError(`${field} must be an https:// link.`);
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clampLimit(limit: number | undefined, fallback = 50, max = 200): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return fallback;
  return Math.min(Math.floor(limit), max);
}
