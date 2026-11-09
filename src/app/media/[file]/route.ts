import { connection } from "next/server";
import { getImage } from "@/lib/media";

/**
 * GET /media/<id>.<ext> → an uploaded image from MongoDB (public, like any shop photo).
 * Files never change (a replaced image gets a new id), so browsers and Vercel's CDN may cache
 * them for a year; the function and database are only hit on the first request per region.
 */
export async function GET(request: Request, ctx: RouteContext<"/media/[file]">) {
  await connection();
  const { file } = await ctx.params;
  let doc;
  try {
    doc = await getImage(file);
  } catch (error) {
    console.error("[media] read failed", error);
    return new Response("Image temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!doc) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  const etag = `"${doc._id}"`;
  const headers = {
    "Content-Type": doc.contentType,
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(doc.data.buffer), { headers: { ...headers, "Content-Length": String(doc.size) } });
}
