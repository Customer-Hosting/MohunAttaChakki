import { getProductById, getProductsByIds } from "@/lib/data/products";
import {
  addToWishlist,
  getWishlistIds,
  MAX_WISHLIST,
  removeFromWishlist,
  removeManyFromWishlist,
} from "@/lib/data/users";
import { requireUser } from "@/lib/firebase/admin";
import type { WishlistItem } from "@/lib/types";

/**
 * GET → { productIds } for the signed-in user.
 * GET ?include=products → also { items } newest first, for the wishlist page.
 *   Deleted products are removed from the wishlist automatically.
 */
export async function GET(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const ids = await getWishlistIds(user.uid);
  if (new URL(request.url).searchParams.get("include") !== "products") {
    return Response.json({ productIds: ids });
  }

  const products = await getProductsByIds(ids, { includeInactive: true });
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) await removeManyFromWishlist(user.uid, missing);

  const items: WishlistItem[] = ids
    .filter((id) => byId.has(id))
    .reverse() // most recently saved first
    .map((id) => {
      const product = byId.get(id)!;
      return product.active
        ? { available: true, product }
        : { available: false, product: { id: product.id, name: product.name } };
    });
  return Response.json({ productIds: ids.filter((id) => byId.has(id)), items });
}

async function readProductId(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.productId === "string" ? body.productId : null;
  } catch {
    return null;
  }
}

/** POST { productId } → add (only existing, active products). Adding twice is a no-op. */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const productId = await readProductId(request);
  const product = productId ? await getProductById(productId) : null;
  if (!product || !product.active) return Response.json({ error: "Product not found." }, { status: 404 });
  const current = await getWishlistIds(user.uid);
  if (!current.includes(product.id) && !(await addToWishlist(user.uid, product.id))) {
    return Response.json({ error: `Your wishlist is full (max ${MAX_WISHLIST} items).` }, { status: 400 });
  }
  return Response.json({ productIds: await getWishlistIds(user.uid) });
}

/** DELETE { productId } → remove. */
export async function DELETE(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const productId = await readProductId(request);
  if (!productId) return Response.json({ error: "Missing productId." }, { status: 400 });
  await removeFromWishlist(user.uid, productId);
  return Response.json({ productIds: await getWishlistIds(user.uid) });
}
