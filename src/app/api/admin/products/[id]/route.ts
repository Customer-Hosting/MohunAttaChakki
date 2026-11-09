import { after } from "next/server";
import { handle, notFound, readJson, refreshProducts } from "@/lib/api";
import { deleteProduct, getProductById, updateProduct } from "@/lib/data/products";
import { requireAdmin } from "@/lib/firebase/admin";
import { allProductImages } from "@/lib/variants";
import { deleteUnreferencedMedia } from "@/lib/media";

type Ctx = RouteContext<"/api/admin/products/[id]">;

export async function GET(request: Request, ctx: Ctx) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await ctx.params;
  const product = await getProductById(id);
  return product ? Response.json({ product }) : notFound("Product not found.");
}

/**
 * PATCH → partial update (any product fields, e.g. { active: false } or { featured: true }).
 * Uploaded images removed from the product are deleted once nothing else uses them.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await ctx.params;
  return handle(async () => {
    const before = await getProductById(id);
    const product = await updateProduct(id, await readJson(request));
    if (!product) return notFound("Product not found.");
    refreshProducts();
    const kept = new Set(allProductImages(product));
    const removed = before ? allProductImages(before).filter((url) => !kept.has(url)) : [];
    if (removed.length) after(() => deleteUnreferencedMedia(removed).catch((e) => console.error("[media] cleanup failed", e)));
    return Response.json({ product });
  });
}

/** DELETE → remove the product, then its uploaded images that nothing else references. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await ctx.params;
  return handle(async () => {
    const product = await deleteProduct(id);
    if (!product) return notFound("Product not found.");
    refreshProducts();
    after(() => deleteUnreferencedMedia(allProductImages(product)).catch((e) => console.error("[media] cleanup failed", e)));
    return Response.json({ ok: true });
  });
}
