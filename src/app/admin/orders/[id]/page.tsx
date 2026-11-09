import { Suspense } from "react";
import OrderDetail from "@/components/admin/OrderDetail";
import { Loading } from "@/components/admin/ui";

// The admin area sits behind a client-side login gate (AdminGate) and loads its data in the
// browser after sign-in, so its pages are not meant to render instantly on navigation. Opting
// out stops the dev-only "could not validate instant navigation" warning for this segment.
export const instant = false;

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<"/admin/orders/[id]">, "params">) {
  const { id } = await params;
  return <OrderDetail orderId={id} />;
}
