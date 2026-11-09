import { handle, readJson } from "@/lib/api";
import { parseCartLines, quoteCart } from "@/lib/data/checkout";

/**
 * POST { items: [{ productId, size, quantity }] } → current prices, stock problems, shipping, total.
 * Public (guests can view their cart); nothing is stored.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const lines = parseCartLines(body.items ?? []);
    if (lines.length === 0) return Response.json({ lines: [], subtotal: 0, shipping: 0, total: 0, ok: false });
    return Response.json(await quoteCart(lines));
  });
}
