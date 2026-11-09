import type { Metadata } from "next";
import CartView from "@/components/cart/CartView";
import { content } from "@/content/en";
import { getStoreSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Cart & Checkout",
  description: "Your Mohan Atta Chakki cart. Pay securely by UPI / QR. Fresh home delivery.",
  robots: { index: false },
};

// Cart contents live in the browser; prices, stock and shipping are re-checked on the server.
export default async function CartPage() {
  const s = await getStoreSettings();
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Cart &amp; Checkout</h1>
      <CartView
        info={{
          storeName: s.storeName,
          qrCode: s.qrCode,
          upiId: s.upiId,
          shippingCharge: s.shippingCharge,
          deliveryEstimate: s.deliveryEstimate,
          exchangePolicy: s.exchangePolicy,
          refundPolicy: s.refundPolicy,
          codNotice: content.policies.cod,
          deliveryNotice: content.policies.delivery,
          paymentNotice: content.policies.payment,
          phone: s.phone,
        }}
      />
    </section>
  );
}
