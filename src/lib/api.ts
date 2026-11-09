import "server-only";
import { revalidateTag } from "next/cache";
import { ValidationError } from "./data/common";
import { SETTINGS_TAG } from "./catalog";
import { PRODUCTS_TAG } from "./data/products";

/** Reads a JSON body; returns {} for an empty or invalid body. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

/** Runs a handler and turns ValidationError into 400 and anything unexpected into a generic 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export const notFound = (what = "Not found") => Response.json({ error: what }, { status: 404 });

/** Storefront caches (see lib/catalog.ts) — expire immediately so the next visitor sees the change. */
export function refreshProducts() {
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}
export function refreshSettings() {
  revalidateTag(SETTINGS_TAG, { expire: 0 });
}
