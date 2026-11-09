import Image from "next/image";
import Link from "next/link";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { assetUrl } from "@/lib/site";
import type { Product } from "@/lib/types";
import { displayImages } from "@/lib/variants";
import Price from "./Price";

export default function ProductCard({
  product,
  ctaLabel = "View Product",
}: {
  product: Product;
  ctaLabel?: string;
}) {
  const href = `/shop/${product.slug}`;
  const [image, hoverImage] = displayImages(product);
  const onSale = product.salePrice != null && product.salePrice < product.price;
  const discount = onSale ? Math.round((1 - product.salePrice! / product.price) * 100) : 0;
  const soldOut = product.stock <= 0;

  return (
    <article className="group flex h-full flex-col rounded-2xl p-1.5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-black/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative">
        <Link href={href} className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-neutral-100" tabIndex={-1}>
          {image ? (
            <>
              <Image
                src={assetUrl(image)}
                alt={product.name}
                fill
                sizes="(min-width: 1280px) 330px, (min-width: 640px) 33vw, 50vw"
                className={`object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${soldOut ? "grayscale-[40%]" : ""}`}
              />
              {/* Second photo fades in on hover when the product has one. */}
              {hoverImage && (
                <Image
                  src={assetUrl(hoverImage)}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 330px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-white/95 py-2 text-center text-xs font-semibold opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none"
              >
                {soldOut ? "Sold out · View" : "Quick view →"}
              </span>
            </>
          ) : (
            <span className="grid h-full place-items-center px-4 text-center font-display text-lg text-ink/40">
              {product.name}
            </span>
          )}
        </Link>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {onSale && discount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">-{discount}%</span>
            )}
            {soldOut && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">Sold out</span>
            )}
          </div>
          <div className="pointer-events-auto">
            <WishlistButton productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-medium sm:text-base">
          <Link href={href} className="transition-colors hover:text-accent group-hover:text-accent">
            {product.name}
          </Link>
        </h3>
        <Price price={product.price} salePrice={product.salePrice} from={product.variants.length > 1} className="mb-3 mt-1 text-sm sm:text-base" />
        <Link
          href={href}
          className="mt-auto rounded-full border border-ink/80 px-4 py-2 text-center text-sm font-semibold transition-all duration-200 hover:bg-ink hover:text-white hover:shadow-md active:scale-[0.98] group-hover:border-ink"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
