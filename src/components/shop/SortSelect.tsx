"use client";

import type { ShopSort } from "@/lib/catalog";

const OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Part of the shop's GET form: submits the form as soon as a sort is chosen. */
export default function SortSelect({ value }: { value: ShopSort }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="shrink-0 text-ink/70">Sort by</span>
      <select
        name="sort"
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-brand"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
