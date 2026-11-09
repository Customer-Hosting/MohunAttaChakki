import { Suspense } from "react";
import ProductForm from "@/components/admin/ProductForm";
import { Loading } from "@/components/admin/ui";

// The admin area sits behind a client-side login gate (AdminGate) and loads its data in the
// browser after sign-in, so its pages are not meant to render instantly on navigation. Opting
// out stops the dev-only "could not validate instant navigation" warning for this segment.
export const instant = false;

// The id is only known at request time, so it is read inside Suspense (Cache Components).
export default function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditProduct params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditProduct({ params, searchParams }: Pick<PageProps<"/admin/products/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ProductForm productId={id} justCreated={query.created === "1"} />;
}
