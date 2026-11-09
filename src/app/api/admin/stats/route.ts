import { handle } from "@/lib/api";
import { getCategories } from "@/lib/data/categories";
import { countOrders, countToShip, listOrders, verifiedRevenue } from "@/lib/data/orders";
import { countOutOfStock, countProducts } from "@/lib/data/products";
import { countUsers } from "@/lib/data/users";
import { requireAdmin } from "@/lib/firebase/admin";

/** Dashboard numbers + latest orders. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  return handle(async () => {
    const [products, activeProducts, outOfStock, categories, orders, toVerify, pendingOrders, toShip, revenue, users, recentOrders] =
      await Promise.all([
        countProducts({ includeInactive: true }),
        countProducts(),
        countOutOfStock(),
        getCategories(),
        countOrders(),
        countOrders({ paymentStatus: "Submitted" }),
        countOrders({ orderStatus: "Pending" }),
        countToShip(),
        verifiedRevenue(),
        countUsers(),
        listOrders({ limit: 5 }),
      ]);
    return Response.json({
      products,
      activeProducts,
      outOfStock,
      categories: categories.length,
      subcategories: categories.reduce((n, c) => n + c.subcategories.length, 0),
      orders,
      toVerify,
      pendingOrders,
      toShip,
      revenue,
      users,
      recentOrders,
    });
  });
}
