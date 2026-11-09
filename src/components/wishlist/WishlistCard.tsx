"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Price from "@/components/product/Price";
import { addToCart, MAX_QTY_PER_LINE, useCart } from "@/lib/cart-store";
import { assetUrl } from "@/lib/site";
import { displayImages } from "@/lib/variants";
import type { WishlistItem } from "@/lib/types";

const smallBtn = "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export default function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => Promise<void> }) {
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    setRemoving(true);
    await onRemove(item.product.id);
    setRemoving(false);
  };
  const removeButton = (
    <button
      type="button"
      onClick={remove}
      disabled={removing}
      aria-label={`Remove ${item.product.name} from wishlist`}
      className={`${smallBtn} text-ink/70 underline hover:text-red-700 disabled:opacity-50`}
    >
      {removing ? "Removing…" : "Remove"}
    </button>
  );

  if (!item.available) {
    return (
      <li className="flex gap-4 rounded-2xl border border-dashed border-black/15 p-3 sm:p-4" data-testid="wishlist-item">
        <div className="grid aspect-[4/5] w-24 shrink-0 place-items-center rounded-xl bg-neutral-100 text-xs text-ink/40 sm:w-32">
          Unavailable
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-medium text-ink/60">{item.product.name}</p>
          <p className="mt-1 text-sm text-ink/60">This product is no longer available.</p>
          <div className="mt-auto pt-3">{removeButton}</div>
        </div>
      </li>
    );
  }

  return <AvailableCard product={item.product} removeButton={removeButton} />;
}

function AvailableCard({
  product,
  removeButton,
}: {
  product: Extract<WishlistItem, { available: true }>["product"];
  removeButton: React.ReactNode;
}) {
  const cart = useCart();
  const [size, setSize] = useState<string>(product.sizes.length === 1 ? product.sizes[0] : "");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const href = `/shop/${product.slug}`;
  const outOfStock = product.stock <= 0;
  // Products with pack sizes: the chosen pack has its own stock.
  const packStock = product.variants.length ? (product.variants.find((v) => v.label === size)?.stock ?? product.stock) : product.stock;
  const maxLine = Math.min(packStock, MAX_QTY_PER_LINE);

  function handleAdd() {
    const chosen = product.sizes.length > 0 ? size || null : null;
    if (product.sizes.length > 0 && !chosen) return setMessage({ kind: "error", text: "Please select a pack size." });
    const inCart = cart.find((i) => i.productId === product.id && i.size === chosen)?.quantity ?? 0;
    if (inCart >= maxLine) return setMessage({ kind: "error", text: `The maximum available (${maxLine}) is already in your cart.` });
    addToCart({ productId: product.id, slug: product.slug, size: chosen, quantity: 1 }, maxLine);
    setMessage({ kind: "success", text: "Added to cart." });
  }

  return (
    <li className="group flex gap-4 rounded-2xl border border-black/10 p-3 transition-all duration-300 hover:border-ink/30 hover:shadow-lg sm:p-4" data-testid="wishlist-item">
      <Link href={href} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:w-32" tabIndex={-1}>
        {displayImages(product)[0] ? (
          <Image src={assetUrl(displayImages(product)[0])} alt={product.name} fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none" />
        ) : (
          <span className="grid h-full place-items-center px-2 text-center text-xs text-ink/40">{product.name}</span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="font-medium hover:text-accent">
            {product.name}
          </Link>
          {removeButton}
        </div>
        <Price price={product.price} salePrice={product.salePrice} from={product.variants.length > 1} className="mt-0.5" />
        {outOfStock && <p className="mt-1 text-sm font-semibold text-red-700">Out of Stock</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {product.sizes.length > 1 && !outOfStock && (
            <label className="text-sm">
              <span className="sr-only">Pack size for {product.name}</span>
              <select
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setMessage(null);
                }}
                className="rounded-lg border border-black/20 bg-white px-2 py-2 text-sm"
              >
                <option value="">Select pack size</option>
                {product.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className={`${smallBtn} bg-ink text-white hover:bg-accent disabled:bg-black/20`}
          >
            {outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <Link href={href} className={`${smallBtn} border border-black/20 hover:border-ink`}>
            View Product
          </Link>
        </div>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.kind === "error" ? "text-red-700" : "text-green-700"}`}>
            {message.text}{" "}
            {message.kind === "success" && (
              <Link href="/cart" className="font-semibold underline">
                View cart
              </Link>
            )}
          </p>
        )}
      </div>
    </li>
  );
}
