"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentProps, type FormEvent } from "react";
import { defaultSizesFor, type Category } from "@/lib/site";
import type { Product } from "@/lib/types";
import ImagePicker from "./ImagePicker";
import { Alert, btnPrimary, btnSecondary, Card, inputClass, Loading, PageTitle } from "./ui";
import { useAdminStats } from "./AdminStats";
import { useAdminApi } from "./useAdminApi";

/** One pack size row in the form (numbers kept as text while typing). */
interface VariantRow {
  key: string; // React key only
  label: string;
  price: string;
  salePrice: string;
  stock: string;
  images: string[];
}

/** Common pack sizes offered as one-click buttons. */
const QUICK_PACKS = ["250 g", "500 g", "750 g", "1 kg", "2 kg", "5 kg"];

let rowSeq = 0;
const newRow = (label = ""): VariantRow => ({ key: `row-${Date.now()}-${rowSeq++}`, label, price: "", salePrice: "", stock: "0", images: [] });

/**
 * ImagePicker that reports its upload state under `pickerId`. The callback it gets is memoised
 * per picker: ImagePicker re-runs an effect whenever onBusyChange changes, so a new function on
 * every render would update state in a loop.
 */
function BusyImagePicker({
  pickerId,
  setPickerBusy,
  ...props
}: Omit<ComponentProps<typeof ImagePicker>, "onBusyChange"> & {
  pickerId: string;
  setPickerBusy: (id: string, busy: boolean) => void;
}) {
  const onBusyChange = useCallback((busy: boolean) => setPickerBusy(pickerId, busy), [pickerId, setPickerBusy]);
  return <ImagePicker {...props} onBusyChange={onBusyChange} />;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: string;
  salePrice: string;
  images: string[];
  sizes: string;
  stock: string;
  featured: boolean;
  active: boolean;
  /** true = several pack sizes, each with its own price, stock and photos */
  multiPack: boolean;
  variants: VariantRow[];
}

const fromProduct = (p: Product): FormState => ({
  name: p.name,
  description: p.description,
  category: p.category,
  subcategory: p.subcategory ?? "",
  price: String(p.price),
  salePrice: p.salePrice != null ? String(p.salePrice) : "",
  images: p.images,
  sizes: p.sizes.join(", "),
  stock: String(p.stock),
  featured: p.featured,
  active: p.active,
  multiPack: p.variants.length > 0,
  variants: p.variants.map((v) => ({
    key: `row-${v.label}-${rowSeq++}`,
    label: v.label,
    price: String(v.price),
    salePrice: v.salePrice != null ? String(v.salePrice) : "",
    stock: String(v.stock),
    images: v.images,
  })),
});

/** Create (no `productId`) or edit a product. */
export default function ProductForm({ productId, justCreated = false }: { productId?: string; justCreated?: boolean }) {
  const api = useAdminApi();
  const { refresh } = useAdminStats();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [sizesTouched, setSizesTouched] = useState(Boolean(productId));
  const [busy, setBusy] = useState(false);
  // Several image pickers (general + one per pack) can upload at once.
  const [busyPickers, setBusyPickers] = useState<Record<string, boolean>>({});
  const uploading = Object.values(busyPickers).some(Boolean);
  // Stable for the whole form; unchanged values return the same state (no extra render).
  const setPickerBusy = useCallback(
    (id: string, busy: boolean) => setBusyPickers((m) => (Boolean(m[id]) === busy ? m : { ...m, [id]: busy })),
    [],
  );
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(
    justCreated ? { kind: "success", text: "Product created. It is now in the shop if marked Active." } : null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await api<{ categories: Category[] }>("/api/admin/categories");
      if (cancelled) return;
      if (!c.ok) return setMessage({ kind: "error", text: c.error });
      setCategories(c.data.categories);
      if (productId) {
        const p = await api<{ product: Product }>(`/api/admin/products/${productId}`);
        if (cancelled) return;
        if (p.ok) setForm(fromProduct(p.data.product));
        else setMessage({ kind: "error", text: p.error });
      } else {
        const first = c.data.categories[0]?.slug ?? "";
        setForm({ name: "", description: "", category: first, subcategory: "", price: "", salePrice: "", images: [], sizes: defaultSizesFor(first).join(", "), stock: "0", featured: false, active: true, multiPack: false, variants: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, productId]);

  if (!form || !categories) return message ? <Alert>{message.text}</Alert> : <Loading />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const selected = categories.find((c) => c.slug === form.category);
  const subcategories = selected?.subcategories ?? [];

  function changeCategory(slug: string) {
    setForm((f) => {
      if (!f) return f;
      const next = categories!.find((c) => c.slug === slug);
      // Reset the subcategory if it doesn't belong to the newly selected category.
      const keepSub = next?.subcategories.some((s) => s.slug === f.subcategory) ? f.subcategory : "";
      return { ...f, category: slug, subcategory: keepSub, sizes: sizesTouched ? f.sizes : defaultSizesFor(slug).join(", ") };
    });
  }

  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setForm((f) => (f ? { ...f, variants: f.variants.map((r) => (r.key === key ? { ...r, ...patch } : r)) } : f));
  const removeRow = (key: string) => {
    setForm((f) => (f ? { ...f, variants: f.variants.filter((r) => r.key !== key) } : f));
    // A removed pack can no longer block saving with an upload state.
    setBusyPickers((m) => {
      if (!(key in m)) return m;
      const next = { ...m };
      delete next[key];
      return next;
    });
  };
  const addRows = (labels: string[]) => setForm((f) => (f ? { ...f, variants: [...f.variants, ...labels.map(newRow)] } : f));
  const moveRow = (key: string, dir: -1 | 1) =>
    setForm((f) => {
      if (!f) return f;
      const i = f.variants.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= f.variants.length) return f;
      const next = [...f.variants];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, variants: next };
    });
  function setMultiPack(on: boolean) {
    setForm((f) => {
      if (!f) return f;
      // Switching on with no rows: carry over the current single pack as the first row, but only
      // if one was entered (otherwise start empty and let the admin add packs).
      const currentLabel = f.sizes.split(",")[0]?.trim() ?? "";
      if (on && f.variants.length === 0 && (currentLabel || f.price)) {
        const first = newRow(currentLabel);
        return { ...f, multiPack: true, variants: [{ ...first, price: f.price, salePrice: f.salePrice, stock: f.stock }] };
      }
      return { ...f, multiPack: on };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    if (uploading) return setMessage({ kind: "error", text: "Please wait for the images to finish uploading." });
    if (form.multiPack && form.variants.length === 0) return setMessage({ kind: "error", text: "Add at least one pack size, or choose “One price”." });
    setBusy(true);
    setMessage(null);
    const payload = {
      name: form.name,
      description: form.description,
      category: form.category,
      subcategory: form.subcategory || null,
      price: form.price,
      salePrice: form.salePrice || null,
      images: form.images,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      stock: form.stock === "" ? 0 : Number(form.stock),
      featured: form.featured,
      active: form.active,
      // Several pack sizes: each has its own price, sale price, stock and photos. The server then
      // derives the shop price ("From ₹…"), total stock and pack list from them.
      variants: form.multiPack
        ? form.variants.map((r) => ({
            label: r.label,
            price: r.price,
            salePrice: r.salePrice || null,
            stock: r.stock === "" ? 0 : Number(r.stock),
            images: r.images,
          }))
        : [],
    };
    const r = productId
      ? await api<{ product: Product }>(`/api/admin/products/${productId}`, { method: "PATCH", json: payload })
      : await api<{ product: Product }>("/api/admin/products", { method: "POST", json: payload });
    setBusy(false);
    if (!r.ok) {
      // Uploaded images stay in the form, so saving again does not re-upload them.
      const kept = form.images.length || form.variants.some((r) => r.images.length) ? " Your images are kept — fix the problem and save again." : "";
      return setMessage({ kind: "error", text: r.error + kept });
    }
    refresh();
    if (!productId) {
      router.push(`/admin/products/${r.data.product.id}?created=1`);
      return;
    }
    setForm(fromProduct(r.data.product));
    setMessage({ kind: "success", text: "Saved. The shop is updated." });
  }

  return (
    <>
      <PageTitle title={productId ? "Edit product" : "Add product"}>
        <Link href="/admin/products" className="text-sm font-semibold underline">
          ← All products
        </Link>
      </PageTitle>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" noValidate>
        <div className="space-y-6">
          <Card className="space-y-4">
            <label className="block text-sm font-medium">
              Product name
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} maxLength={120} />
            </label>
            <label className="block text-sm font-medium">
              Description <span className="font-normal text-ink/50">(optional)</span>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} maxLength={5000} className={inputClass} />
            </label>
          </Card>
          <Card>
            <BusyImagePicker pickerId="main" setPickerBusy={setPickerBusy} label="Images" folder="products" value={form.images} onChange={(images) => set("images", images)} />
            {form.multiPack && (
              <p className="mt-2 text-xs text-ink/60">These photos show for every pack size. Add photos for a single pack below; they show first when that pack is selected.</p>
            )}
          </Card>
          <Card className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Category
              <select value={form.category} onChange={(e) => changeCategory(e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {!selected && <option value={form.category}>{form.category} (removed)</option>}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Subcategory <span className="font-normal text-ink/50">(optional)</span>
              <select value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} className={inputClass} disabled={subcategories.length === 0}>
                <option value="">{subcategories.length ? "— None —" : "No subcategories"}</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.multiPack && (
            <label className="block text-sm font-medium sm:col-span-2">
              Pack size <span className="font-normal text-ink/50">(e.g. 1 kg. Each weight with its own price is a separate product. Comma separated, or leave empty)</span>
              <input
                value={form.sizes}
                onChange={(e) => {
                  setSizesTouched(true);
                  set("sizes", e.target.value);
                }}
                className={inputClass}
                placeholder="1 kg"
              />
            </label>
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Pricing</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pricing">
                {[
                  { on: false, title: "One price", text: "One pack size, one price and stock." },
                  { on: true, title: "Different pack sizes", text: "e.g. 250 g, 500 g, 750 g, 1 kg, each with its own price, stock and photos." },
                ].map((o) => (
                  <label
                    key={String(o.on)}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${form.multiPack === o.on ? "border-ink bg-neutral-50" : "border-black/15 hover:border-ink/40"}`}
                  >
                    <input type="radio" name="pricing" checked={form.multiPack === o.on} onChange={() => setMultiPack(o.on)} className="mt-0.5 h-4 w-4 accent-ink" />
                    <span>
                      <span className="block font-semibold">{o.title}</span>
                      <span className="block text-ink/60">{o.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {form.multiPack && (
              <div className="space-y-4">
                {form.variants.map((r, i) => (
                  <fieldset key={r.key} className="rounded-xl border border-black/10 p-4">
                    <legend className="px-1 text-sm font-semibold">Pack {i + 1}{r.label ? `: ${r.label}` : ""}</legend>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <label className="block text-sm font-medium">
                        Pack size
                        <input value={r.label} onChange={(e) => updateRow(r.key, { label: e.target.value })} placeholder="250 g" maxLength={20} className={inputClass} />
                      </label>
                      <label className="block text-sm font-medium">
                        Price (₹)
                        <input type="number" inputMode="decimal" min={1} step="any" value={r.price} onChange={(e) => updateRow(r.key, { price: e.target.value })} className={inputClass} />
                      </label>
                      <label className="block text-sm font-medium">
                        Sale price <span className="font-normal text-ink/50">(opt.)</span>
                        <input type="number" inputMode="decimal" min={1} step="any" value={r.salePrice} onChange={(e) => updateRow(r.key, { salePrice: e.target.value })} className={inputClass} />
                      </label>
                      <label className="block text-sm font-medium">
                        Stock
                        <input type="number" inputMode="numeric" min={0} step={1} value={r.stock} onChange={(e) => updateRow(r.key, { stock: e.target.value })} className={inputClass} />
                      </label>
                    </div>
                    <div className="mt-3">
                      <BusyImagePicker
                        pickerId={r.key}
                        setPickerBusy={setPickerBusy}
                        label={`Photos for ${r.label || "this pack"} (optional)`}
                        folder="products"
                        value={r.images}
                        onChange={(images) => updateRow(r.key, { images })}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button type="button" onClick={() => moveRow(r.key, -1)} disabled={i === 0} className={btnSecondary} aria-label={`Move ${r.label || "pack"} up`}>↑</button>
                      <button type="button" onClick={() => moveRow(r.key, 1)} disabled={i === form.variants.length - 1} className={btnSecondary} aria-label={`Move ${r.label || "pack"} down`}>↓</button>
                      <button type="button" onClick={() => removeRow(r.key)} className={`${btnSecondary} text-red-700`}>Remove pack</button>
                    </div>
                  </fieldset>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => addRows([""])} className={btnSecondary}>+ Add pack size</button>
                  <span className="text-xs text-ink/60">Quick add:</span>
                  {QUICK_PACKS.filter((q) => !form.variants.some((r) => r.label.trim().toLowerCase() === q)).map((q) => (
                    <button key={q} type="button" onClick={() => addRows([q])} className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-ink">
                      + {q}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink/60">The shop shows the cheapest pack as “From ₹…”. Customers choose a pack on the product page; its price, stock and photos switch automatically.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {!form.multiPack && (
          <Card className="space-y-4">
            <label className="block text-sm font-medium">
              Price (₹)
              <input required type="number" inputMode="decimal" min={1} step="any" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Sale price (₹) <span className="font-normal text-ink/50">(optional, lower than price)</span>
              <input type="number" inputMode="decimal" min={1} step="any" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Stock
              <input type="number" inputMode="numeric" min={0} step={1} value={form.stock} onChange={(e) => set("stock", e.target.value)} className={inputClass} />
            </label>
          </Card>
          )}
          <Card className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-5 w-5 accent-ink" />
              Active (visible in the shop)
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-5 w-5 accent-ink" />
              Featured on the home page
            </label>
          </Card>
          {message && <Alert kind={message.kind}>{message.text}</Alert>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy || uploading} className={`${btnPrimary} flex-1 py-3`}>
              {busy ? "Saving…" : uploading ? "Uploading images…" : productId ? "Save changes" : "Create product"}
            </button>
            <Link href="/admin/products" className={`${btnSecondary} py-3`}>
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
