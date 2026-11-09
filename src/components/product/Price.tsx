import { formatPrice } from "@/lib/format";

/** Shows the sale price with the original struck through when a sale is active. */
export default function Price({
  price,
  salePrice,
  className = "",
  from = false,
}: {
  price: number;
  salePrice?: number | null;
  className?: string;
  /** Prefix "From" (products with several pack sizes show their cheapest pack). */
  from?: boolean;
}) {
  const onSale = salePrice != null && salePrice < price;
  const prefix = from ? <span className="mr-1 text-[0.85em] font-normal text-ink/60">From</span> : null;
  if (!onSale) return <p className={`font-semibold ${className}`}>{prefix}{formatPrice(price)}</p>;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-semibold text-accent">{prefix}{formatPrice(salePrice)}</span>
      <span className="text-sm text-ink/50 line-through">
        <span className="sr-only">Original price </span>
        {formatPrice(price)}
      </span>
    </p>
  );
}
