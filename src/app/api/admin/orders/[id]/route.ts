import { handle, notFound, readJson, refreshProducts } from "@/lib/api";
import { getOrderById, updateOrderStatus } from "@/lib/data/orders";
import { requireAdmin } from "@/lib/firebase/admin";

type Ctx = RouteContext<"/api/admin/orders/[id]">;

export async function GET(request: Request, ctx: Ctx) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  return order ? Response.json({ order }) : notFound("Order not found.");
}

/** PATCH { paymentStatus?, orderStatus? } — cancelling returns stock; re-opening takes it again. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await ctx.params;
  return handle(async () => {
    const body = await readJson(request);
    const order = await updateOrderStatus(id, { paymentStatus: body.paymentStatus, orderStatus: body.orderStatus });
    if (!order) return notFound("Order not found.");
    if (body.orderStatus !== undefined) refreshProducts(); // stock may have changed
    return Response.json({ order });
  });
}
