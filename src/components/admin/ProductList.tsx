"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { assetUrl, categoryName, subcategoryName, type Category } from "@/lib/site";
import type { Product } from "@/lib/types";
import { Alert, btnDanger, inputClass, Loading, PageTitle } from "./ui";
import { useAdminStats } from "./AdminStats";
import { displayImages } from "@/lib/variants";
import { useAdminApi } from "./useAdminApi";

export default function ProductList() {
  const api = useAdminApi();
  const { refresh } = useAdminStats();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    const r = await api<{ products: Product[] }>(`/api/admin/products?${params}`);
    if (r.ok) setProducts(r.data.products);
    else setMessage({ kind: "error", text: r.error });
  }, [api, q, category]);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/admin/categories").then((r) => r.ok && setCategories(r.data.categories));
  }, [api]);

  useEffect(() => {
    const t = setTimeout(load, 250); // small debounce for the search box
    return () => clearTimeout(t);
  }, [load]);

  async function toggle(p: Product, field: "active" | "featured") {
    setBusyId(p.id);
    const r = await api<{ product: Product }>(`/api/admin/products/${p.id}`, { method: "PATCH", json: { [field]: !p[field] } });
    setBusyId(null);
    if (r.ok) {
      setProducts((list) => list?.map((x) => (x.id === p.id ? r.data.product : x)) ?? null);
      refresh();
    }
    else setMessage({ kind: "error", text: r.error });
  }

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.\n\nTip: to hide it temporarily, set it inactive instead.`)) return;
    setBusyId(p.id);
    const r = await api(`/api/admin/products/${p.id}`, { method: "DELETE" });
    setBusyId(null);
    if (r.ok) {
      setProducts((list) => list?.filter((x) => x.id !== p.id) ?? null);
      setMessage({ kind: "success", text: `Deleted "${p.name}".` });
      refresh();
    } else setMessage({ kind: "error", text: r.error });
  }

  const cat = (p: Product) => categoryName(p.category, categories);
  const sub = (p: Product) => (p.subcategory ? subcategoryName(p.category, p.subcategory, categories) : "—");
  const toggleBtn = (on: boolean) =>
    `rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "bg-green-100 text-green-800" : "bg-neutral-100 text-ink/60"}`;

  return (
    <>
      <PageTitle title="Products">
        <Link href="/admin/products/new" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent">
          + Add product
        </Link>
      </PageTitle>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="text-sm">
          <span className="sr-only">Search products</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <div className="mb-4">
          <Alert kind={message.kind}>{message.text}</Alert>
        </div>
      )}

      {!products ? (
        <Loading />
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 p-10 text-center text-sm text-ink/60">No products found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-black/10 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Subcategory</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Featured</th>
                  <th className="p-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {products.map((p) => (
                  <tr key={p.id} data-testid="admin-product-row">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Thumb p={p} />
                        <span>
                          <span className="block font-medium">{p.name}</span>
                          {p.variants.length > 0 && <span className="block text-xs text-ink/60">{p.variants.length} pack sizes: {p.variants.map((v) => v.label).join(", ")}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{cat(p)}</td>
                    <td className="p-3">{sub(p)}</td>
                    <td className="p-3">
                      {p.variants.length > 1 && <span className="text-ink/60">From </span>}
                      {p.salePrice != null ? (
                        <>
                          {formatPrice(p.salePrice)} <s className="text-ink/50">{formatPrice(p.price)}</s>
                        </>
                      ) : (
                        formatPrice(p.price)
                      )}
                    </td>
                    <td className={`p-3 ${p.stock <= 0 ? "font-semibold text-red-700" : ""}`}>{p.stock}</td>
                    <td className="p-3">
                      <button type="button" disabled={busyId === p.id} onClick={() => toggle(p, "active")} className={toggleBtn(p.active)} aria-label={`${p.name}: ${p.active ? "active, click to hide" : "hidden, click to activate"}`}>
                        {p.active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="p-3">
                      <button type="button" disabled={busyId === p.id} onClick={() => toggle(p, "featured")} className={toggleBtn(p.featured)} aria-label={`${p.name}: ${p.featured ? "featured, click to unfeature" : "not featured, click to feature"}`}>
                        {p.featured ? "Featured" : "No"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${p.id}`} className="rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold hover:border-ink">
                          Edit
                        </Link>
                        <button type="button" disabled={busyId === p.id} onClick={() => remove(p)} className={btnDanger} aria-label={`Delete ${p.name}`}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="rounded-2xl border border-black/10 bg-white p-3" data-testid="admin-product-card">
                <div className="flex gap-3">
                  <Thumb p={p} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink/60">
                      {cat(p)} · {sub(p)}
                    </p>
                    <p className="text-sm">
                      {formatPrice(p.salePrice ?? p.price)} · Stock <span className={p.stock <= 0 ? "font-semibold text-red-700" : ""}>{p.stock}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busyId === p.id} onClick={() => toggle(p, "active")} className={toggleBtn(p.active)}>
                    {p.active ? "Active" : "Hidden"}
                  </button>
                  <button type="button" disabled={busyId === p.id} onClick={() => toggle(p, "featured")} className={toggleBtn(p.featured)}>
                    {p.featured ? "Featured" : "Not featured"}
                  </button>
                  <span className="flex-1" />
                  <Link href={`/admin/products/${p.id}`} className="rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold">
                    Edit
                  </Link>
                  <button type="button" disabled={busyId === p.id} onClick={() => remove(p)} className={btnDanger}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Thumb({ p }: { p: Product }) {
  return (
    <span className="relative block h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
      {displayImages(p)[0] && <Image src={assetUrl(displayImages(p)[0])} alt="" fill sizes="48px" className="object-cover" />}
    </span>
  );
}
