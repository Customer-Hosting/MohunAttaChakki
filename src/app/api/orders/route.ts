import { handle, readJson, refreshProducts } from "@/lib/api";
import { parseCartLines, quoteCart, toOrderItems } from "@/lib/data/checkout";
import { createOrder, listOrdersByUser, parseCustomerDetails, parseTransactionId } from "@/lib/data/orders";
import { requireUser } from "@/lib/firebase/admin";

/** GET → the signed-in customer's own orders, newest first. */
export async function GET(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  return handle(async () => Response.json({ orders: await listOrdersByUser(user.uid, 20) }));
}

/**
 * POST { items, details, transactionId } → { order }
 * Login required. Prices, stock and the ₹ shipping charge are taken from the database;
 * payment is UPI/QR only (no COD) and is verified manually by the admin.
 * 409 → the cart changed (out of stock / price / removed); the response includes a fresh quote.
 */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  return handle(async () => {
    const body = await readJson(request);
    const lines = parseCartLines(body.items ?? []);
    if (lines.length === 0) return Response.json({ error: "Your cart is empty." }, { status: 400 });
    const details = parseCustomerDetails(body.details);
    const transactionId = parseTransactionId(body.transactionId);

    const quote = await quoteCart(lines);
    if (!quote.ok) {
      return Response.json({ error: "Some items in your cart need attention.", quote }, { status: 409 });
    }
    const result = await createOrder({
      ...details,
      userId: user.uid,
      items: toOrderItems(quote),
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      total: quote.total,
      transactionId,
    });
    if (!result.ok) {
      return Response.json(
        { error: "Sorry, an item just sold out. Please review your cart.", quote: await quoteCart(lines) },
        { status: 409 },
      );
    }
    refreshProducts(); // stock changed
    return Response.json({ order: result.order }, { status: 201 });
  });
}
