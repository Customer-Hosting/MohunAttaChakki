"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { addToCart, MAX_QTY_PER_LINE, useCart } from "@/lib/cart-store";
import type { Product } from "@/lib/types";

type PurchaseProduct = Pick<Product, "id" | "slug" | "name" | "sizes" | "stock">;

export function stockLabel(stock: number): { text: string; tone: string } {
  if (stock <= 0) return { text: "Out of Stock", tone: "text-red-700" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "text-amber-700" };
  return { text: "In stock", tone: "text-green-700" };
}

/** Pack size, quantity, Add to Cart, Buy Now and Wishlist for the product page. */
export default function ProductPurchase({
  product,
  size: controlledSize,
  onSizeChange,
  packStock,
}: {
  product: PurchaseProduct;
  /** Controlled pack size (used by ProductView for products with pack sizes). */
  size?: string | null;
  onSizeChange?: (size: string) => void;
  /** Stock per pack size; packs with 0 are shown as sold out. */
  packStock?: Record<string, number>;
}) {
  const router = useRouter();
  const { status } = useAuth();
  const cart = useCart();
  const hasSizes = product.sizes.length > 0;
  const [ownSize, setOwnSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const size = controlledSize !== undefined ? controlledSize : ownSize;
  const setSize = (s: string) => (onSizeChange ? onSizeChange(s) : setOwnSize(s));
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const outOfStock = product.stock <= 0;
  // Already in cart for this size counts against what can still be added.
  const inCart = cart.find((i) => i.productId === product.id && i.size === size)?.quantity ?? 0;
  const maxLine = Math.min(product.stock, MAX_QTY_PER_LINE);
  const canAdd = Math.max(0, maxLine - inCart);
  const maxQty = Math.max(1, canAdd);
  const qty = Math.min(quantity, maxQty);
  const stock = stockLabel(product.stock);

  function add(): boolean {
    if (outOfStock) return false;
    if (hasSizes && !size) {
      setMessage({ kind: "error", text: "Please select a pack size." });
      return false;
    }
    if (canAdd <= 0) {
      setMessage({ kind: "error", text: `You already have the maximum available (${maxLine}) in your cart.` });
      return false;
    }
    addToCart({ productId: product.id, slug: product.slug, size, quantity: qty }, maxLine);
    setQuantity(1);
    return true;
  }

  function handleAddToCart() {
    if (add()) setMessage({ kind: "success", text: `Added ${qty} × ${product.name}${size ? ` (${size})` : ""} to your cart.` });
  }

  function handleBuyNow() {
    if (outOfStock) return;
    if (hasSizes && !size) {
      setMessage({ kind: "error", text: "Please select a pack size." });
      return;
    }
    // If the maximum is already in the cart, just continue to checkout.
    if (canAdd > 0) addToCart({ productId: product.id, slug: product.slug, size, quantity: qty }, maxLine);
    // Checkout requires an account: guests go to login/signup, then straight to the cart.
    router.push(status === "authenticated" ? "/cart" : "/login?next=%2Fcart");
  }

  return (
    <div className="space-y-6">
      <p className={`text-sm font-semibold ${stock.tone}`} data-testid="stock-status">
        {stock.text}
      </p>

      {hasSizes && (
        <fieldset disabled={outOfStock && !packStock}>
          <legend className="mb-2 text-sm font-semibold">
            Pack size{size ? <span className="font-normal text-ink/70">: {size}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => {
                  setSize(s);
                  setQuantity(1);
                  setMessage(null);
                }}
                className={`min-w-12 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  size === s ? "border-ink bg-ink text-white" : "border-black/20 hover:border-ink"
                } ${packStock && (packStock[s] ?? 0) <= 0 && size !== s ? "text-ink/40 line-through decoration-1" : ""}`}
              >
                {s}
                {packStock && (packStock[s] ?? 0) <= 0 && <span className="sr-only"> (out of stock)</span>}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold" id="qty-label">
          Quantity
        </p>
        <div className="inline-flex items-center rounded-lg border border-black/20" role="group" aria-labelledby="qty-label">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={outOfStock || qty <= 1}
            onClick={() => setQuantity(Math.max(1, qty - 1))}
            className="h-11 w-11 text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center font-semibold" aria-live="polite" data-testid="qty">
            {outOfStock ? 0 : qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={outOfStock || qty >= maxQty}
            onClick={() => setQuantity(Math.min(maxQty, qty + 1))}
            className="h-11 w-11 text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}
        >
          {message.text}{" "}
          {message.kind === "success" && (
            <Link href="/cart" className="font-semibold underline">
              View cart
            </Link>
          )}
        </p>
      )}

      {/* Side by side on every screen size (equal widths); tighter padding on small phones. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="min-h-12 whitespace-nowrap rounded-full border-2 border-ink px-3 py-3 text-sm font-semibold transition-colors hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-black/20 disabled:text-ink/40 disabled:hover:bg-transparent sm:px-6"
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock || status === "loading"}
          className="min-h-12 whitespace-nowrap rounded-full border-2 border-ink bg-ink px-3 py-3 text-sm font-semibold text-white transition-colors hover:border-accent hover:bg-accent disabled:cursor-not-allowed disabled:border-transparent disabled:bg-black/20 sm:px-6"
        >
          {outOfStock ? "Out of Stock" : "Buy Now"}
        </button>
      </div>

      <WishlistButton productId={product.id} productName={product.name} variant="full" />
    </div>
  );
}
