import { Suspense } from "react";
import OrderList from "@/components/admin/OrderList";
import { Loading } from "@/components/admin/ui";

// The admin area sits behind a client-side login gate (AdminGate) and loads its data in the
// browser after sign-in, so its pages are not meant to render instantly on navigation. Opting
// out stops the dev-only "could not validate instant navigation" warning for this segment.
export const instant = false;

// ?paymentStatus=Submitted etc. (links from the dashboard) pre-select the filters.
export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<Loading />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return <OrderList initialPayment={one(q.paymentStatus)} initialOrder={one(q.orderStatus)} />;
}
