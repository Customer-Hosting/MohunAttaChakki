import ProductForm from "@/components/admin/ProductForm";

// The admin area sits behind a client-side login gate (AdminGate) and loads its data in the
// browser after sign-in, so its pages are not meant to render instantly on navigation. Opting
// out stops the dev-only "could not validate instant navigation" warning for this segment.
export const instant = false;

export default function NewProductPage() {
  return <ProductForm />;
}
