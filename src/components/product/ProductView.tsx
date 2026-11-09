"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { findVariant, hasVariants, imagesFor } from "@/lib/variants";
import ImageGallery from "./ImageGallery";
import Price from "./Price";
import ProductPurchase from "./ProductPurchase";

type ViewProduct = Pick<Product, "id" | "slug" | "name" | "images" | "price" | "salePrice" | "sizes" | "stock" | "variants">;

/**
 * Gallery + price + purchase box. For products with pack sizes, choosing a pack switches the
 * photos, price, sale price and stock to that pack. `heading` and `children` are server-rendered.
 */
export default function ProductView({
  product,
  heading,
  children,
}: {
  product: ViewProduct;
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  const multi = hasVariants(product);
  // Start on the first pack that is in stock (or the first pack), so a real price is shown.
  const [size, setSize] = useState<string | null>(() =>
    multi ? (product.variants.find((v) => v.stock > 0) ?? product.variants[0]).label : product.sizes.length === 1 ? product.sizes[0] : null,
  );
  const variant = findVariant(product, size);
  const price = variant ? variant.price : product.price;
  const salePrice = variant ? variant.salePrice : product.salePrice;
  const stock = multi ? (variant?.stock ?? 0) : product.stock;
  const onSale = salePrice != null && salePrice < price;
  const discount = onSale ? Math.round((1 - salePrice! / price) * 100) : 0;
  const images = multi ? imagesFor(product, size) : product.images;

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      {/* Remount per pack so the gallery starts on that pack's first photo. */}
      <ImageGallery key={multi ? size ?? "" : "all"} images={images} name={variant ? `${product.name} (${variant.label})` : product.name} />

      <div>
        {heading}
        <div className="mt-3 flex items-center gap-3">
          <Price price={price} salePrice={salePrice} className="text-2xl" />
          {discount > 0 && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">{discount}% off</span>}
          {variant && <span className="text-sm text-ink/60">for {variant.label}</span>}
        </div>

        <div className="mt-6 border-t border-black/10 pt-6">
          <ProductPurchase
            product={{ id: product.id, slug: product.slug, name: product.name, sizes: product.sizes, stock }}
            size={size}
            onSizeChange={setSize}
            packStock={multi ? Object.fromEntries(product.variants.map((v) => [v.label, v.stock])) : undefined}
          />
        </div>

        {children}
      </div>
    </div>
  );
}
