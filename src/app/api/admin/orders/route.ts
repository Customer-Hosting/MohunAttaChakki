import { handle } from "@/lib/api";
import { countOrders, isOrderStatus, isPaymentStatus, listOrders } from "@/lib/data/orders";
import { requireAdmin } from "@/lib/firebase/admin";

/** GET ?paymentStatus=&orderStatus=&page= → orders, newest first. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const url = new URL(request.url);
    const ps = url.searchParams.get("paymentStatus");
    const os = url.searchParams.get("orderStatus");
    const filter = {
      paymentStatus: isPaymentStatus(ps) ? ps : undefined,
      orderStatus: isOrderStatus(os) ? os : undefined,
    };
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = 30;
    const [orders, total] = await Promise.all([
      listOrders({ ...filter, limit: pageSize, skip: (page - 1) * pageSize }),
      countOrders(filter),
    ]);
    return Response.json({ orders, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  });
}
