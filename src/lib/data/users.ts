import "server-only";
import { MongoServerError, type WithId } from "mongodb";
import { collections } from "../db";
import type { UserDoc, UserProfile, UserSummary } from "../types";
import { displayEmail, phoneFromLoginEmail } from "../validation";
import { clampLimit } from "./common";

export function toUserProfile(doc: UserDoc): UserProfile {
  return { name: doc.name, email: doc.email, phone: doc.phone, role: doc.role };
}

export function toUserSummary(doc: WithId<UserDoc>): UserSummary {
  return {
    id: doc._id.toHexString(),
    firebaseUid: doc.firebaseUid,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}

export interface AuthIdentity {
  uid: string;
  email: string;
  name: string | null;
}

/**
 * Creates the user on first login, otherwise refreshes email (and name/phone when given).
 * New users are ALWAYS created with role "customer" — the role is never taken from input.
 */
export async function upsertUserFromAuth(
  identity: AuthIdentity,
  details: { name?: string | null; phone?: string | null } = {},
): Promise<UserDoc> {
  const { users } = await collections();
  const now = new Date();

  // Phone-only customers sign in with an internal ID (see lib/validation.ts); store "" as their email.
  const set: Partial<UserDoc> = { email: displayEmail(identity.email), updatedAt: now };
  if (details.name) set.name = details.name;
  if (details.phone) set.phone = details.phone;

  const setOnInsert: Partial<UserDoc> = { firebaseUid: identity.uid, role: "customer", createdAt: now };
  if (!details.name) setOnInsert.name = identity.name || (displayEmail(identity.email).split("@")[0] || "Customer");
  if (!details.phone) setOnInsert.phone = phoneFromLoginEmail(identity.email) ?? "";

  const run = () =>
    users.findOneAndUpdate(
      { firebaseUid: identity.uid },
      { $set: set, $setOnInsert: setOnInsert },
      { upsert: true, returnDocument: "after" },
    );

  try {
    return (await run())!;
  } catch (error) {
    // Two simultaneous first logins can race on the unique index; the retry updates instead.
    if (error instanceof MongoServerError && error.code === 11000) return (await run())!;
    throw error;
  }
}

/** Server-side only. Callers must check ADMIN_EMAILS first. */
export async function setUserRole(firebaseUid: string, role: UserDoc["role"]): Promise<UserDoc | null> {
  const { users } = await collections();
  return users.findOneAndUpdate(
    { firebaseUid },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function getUserByUid(firebaseUid: string): Promise<UserDoc | null> {
  const { users } = await collections();
  return users.findOne({ firebaseUid });
}

/** Admin list, newest first. */
export async function listUsers({ limit, skip = 0 }: { limit?: number; skip?: number } = {}): Promise<UserSummary[]> {
  const { users } = await collections();
  const docs = await users
    .find({}, { projection: { wishlist: 0 } })
    .sort({ createdAt: -1 })
    .skip(Math.max(0, Math.floor(skip)))
    .limit(clampLimit(limit, 50))
    .toArray();
  return docs.map(toUserSummary);
}

// ---------------------------------------------------------------------------
// Wishlist (stored as an array of product ids on the user document)
// ---------------------------------------------------------------------------

export const MAX_WISHLIST = 100;

export async function getWishlistIds(firebaseUid: string): Promise<string[]> {
  const { users } = await collections();
  const doc = await users.findOne({ firebaseUid }, { projection: { wishlist: 1 } });
  return [...new Set(doc?.wishlist ?? [])]; // $addToSet already prevents duplicates; this is a safety net
}

/** Returns false if the user record doesn't exist yet or the wishlist is full. */
export async function addToWishlist(firebaseUid: string, productId: string): Promise<boolean> {
  const { users } = await collections();
  const result = await users.updateOne(
    // Size check in the filter keeps the cap atomic.
    { firebaseUid, $or: [{ wishlist: { $exists: false } }, { [`wishlist.${MAX_WISHLIST - 1}`]: { $exists: false } }] },
    { $addToSet: { wishlist: productId }, $set: { updatedAt: new Date() } },
  );
  return result.matchedCount === 1;
}

export async function removeFromWishlist(firebaseUid: string, productId: string): Promise<void> {
  await removeManyFromWishlist(firebaseUid, [productId]);
}

/** Removes several ids at once (used to clean up products that were deleted). */
export async function removeManyFromWishlist(firebaseUid: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const { users } = await collections();
  await users.updateOne({ firebaseUid }, { $pullAll: { wishlist: productIds }, $set: { updatedAt: new Date() } });
}

export async function countUsers(): Promise<number> {
  const { users } = await collections();
  return users.countDocuments();
}
