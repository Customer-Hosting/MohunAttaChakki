"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { assetUrl, type Category, type Subcategory } from "@/lib/site";
import ImagePicker from "./ImagePicker";
import { Alert, btnDanger, btnPrimary, btnSecondary, Card, inputClass, Loading, PageTitle } from "./ui";
import { useAdminApi } from "./useAdminApi";

interface Usage {
  categories: Record<string, number>;
  subcategories: Record<string, number>;
}
type Data = { categories: Category[]; usage: Usage };

export default function CategoryManager() {
  const api = useAdminApi();
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    api<Data>("/api/admin/categories").then((r) => (r.ok ? setData(r.data) : setMessage({ kind: "error", text: r.error })));
  }, [api]);

  /** Sends one action; on success replaces the list. Returns true when it worked. */
  async function act(body: Record<string, unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    const r = await api<Data>("/api/admin/categories", { method: "POST", json: body });
    setBusy(false);
    if (!r.ok) {
      setMessage({ kind: "error", text: r.error });
      return false;
    }
    setData(r.data);
    setMessage({ kind: "success", text: success });
    return true;
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "createCategory", name: newCategory }, `Added "${newCategory.trim()}".`)) setNewCategory("");
  }

  if (!data) return message ? <Alert>{message.text}</Alert> : <Loading />;

  return (
    <>
      <PageTitle title="Categories" />
      <p className="-mt-3 mb-5 text-sm text-ink/70">
        Categories and subcategories used in the shop filters and the product form. A category or subcategory that products
        still use can’t be deleted — move those products first.
      </p>

      <Card className="mb-5">
        <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-medium">
            New category
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={40} placeholder="e.g. Shirts" className={inputClass} />
          </label>
          <button type="submit" disabled={busy || !newCategory.trim()} className={btnPrimary}>
            Add category
          </button>
        </form>
      </Card>

      <div aria-live="polite" className="mb-4">
        {message && <Alert kind={message.kind}>{message.text}</Alert>}
      </div>

      <ul className="space-y-4">
        {data.categories.map((category) => (
          <CategoryItem key={category.id} category={category} usage={data.usage} busy={busy} act={act} />
        ))}
      </ul>
    </>
  );
}

function CategoryItem({
  category,
  usage,
  busy,
  act,
}: {
  category: Category;
  usage: Usage;
  busy: boolean;
  act: (body: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [newSub, setNewSub] = useState("");
  const count = usage.categories[category.slug] ?? 0;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "updateCategory", id: category.id, name }, `Renamed to "${name.trim()}".`)) setEditing(false);
  }

  async function remove() {
    if (count > 0) {
      window.alert(`"${category.name}" is used by ${count} product${count === 1 ? "" : "s"}.\n\nMove ${count === 1 ? "it" : "them"} to another category first (Products → Edit), then delete.`);
      return;
    }
    if (window.confirm(`Delete the category "${category.name}" and its ${category.subcategories.length} subcategories?`)) {
      await act({ action: "deleteCategory", id: category.id }, `Deleted "${category.name}".`);
    }
  }

  async function addSub(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "createSubcategory", categoryId: category.id, name: newSub }, `Added "${newSub.trim()}" to ${category.name}.`)) setNewSub("");
  }

  return (
    <li className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5" data-testid="category-item">
      <div className="flex flex-wrap items-start gap-4">
        <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {category.image && <Image src={assetUrl(category.image)} alt="" fill sizes="64px" className="object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={save} className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`cat-${category.id}`}>
                Category name
              </label>
              <input id={`cat-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={`${inputClass} mt-0 max-w-xs`} autoFocus />
              <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>
                Save
              </button>
              <button type="button" onClick={() => { setEditing(false); setName(category.name); }} className={btnSecondary}>
                Cancel
              </button>
            </form>
          ) : (
            <h2 className="font-display text-xl font-semibold">{category.name}</h2>
          )}
          <p className="text-xs text-ink/60">
            /shop?category={category.slug} · {count} product{count === 1 ? "" : "s"}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={btnSecondary} aria-label={`Rename ${category.name}`}>
              Rename
            </button>
            <button type="button" onClick={remove} disabled={busy} className={btnDanger} aria-label={`Delete ${category.name}`}>
              Delete
            </button>
          </div>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-ink/70">Category image</summary>
        <div className="mt-2">
          <ImagePicker
            label="Category image"
            folder="categories"
            max={1}
            value={category.image ? [category.image] : []}
            onChange={(images) => act({ action: "updateCategory", id: category.id, image: images[0] ?? "" }, `Updated the ${category.name} image.`)}
          />
        </div>
      </details>

      <div className="mt-4 border-t border-black/10 pt-4">
        <h3 className="text-sm font-semibold">Subcategories</h3>
        {category.subcategories.length === 0 ? (
          <p className="mt-1 text-sm text-ink/60">None yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {category.subcategories.map((sub) => (
              <SubItem key={sub.id} category={category} sub={sub} count={usage.subcategories[`${category.slug}/${sub.slug}`] ?? 0} busy={busy} act={act} />
            ))}
          </ul>
        )}
        <form onSubmit={addSub} className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`newsub-${category.id}`}>
            New subcategory for {category.name}
          </label>
          <input id={`newsub-${category.id}`} value={newSub} onChange={(e) => setNewSub(e.target.value)} maxLength={40} placeholder="New subcategory" className={`${inputClass} mt-0 max-w-xs`} />
          <button type="submit" disabled={busy || !newSub.trim()} className={btnSecondary}>
            Add subcategory
          </button>
        </form>
      </div>
    </li>
  );
}

function SubItem({
  category,
  sub,
  count,
  busy,
  act,
}: {
  category: Category;
  sub: Subcategory;
  count: number;
  busy: boolean;
  act: (body: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "updateSubcategory", categoryId: category.id, id: sub.id, name }, `Renamed to "${name.trim()}".`)) setEditing(false);
  }

  async function remove() {
    if (count > 0) {
      window.alert(`"${sub.name}" is used by ${count} product${count === 1 ? "" : "s"}.\n\nChange ${count === 1 ? "its" : "their"} subcategory first (Products → Edit), then delete.`);
      return;
    }
    if (window.confirm(`Delete the subcategory "${sub.name}" from ${category.name}?`)) {
      await act({ action: "deleteSubcategory", categoryId: category.id, id: sub.id }, `Deleted "${sub.name}".`);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-2" data-testid="subcategory-item">
      {editing ? (
        <form onSubmit={save} className="flex flex-1 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`sub-${sub.id}`}>
            Subcategory name
          </label>
          <input id={`sub-${sub.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={`${inputClass} mt-0 max-w-xs`} autoFocus />
          <button type="submit" disabled={busy || !name.trim()} className={btnPrimary}>
            Save
          </button>
          <button type="button" onClick={() => { setEditing(false); setName(sub.name); }} className={btnSecondary}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span className="flex-1">
            {sub.name} <span className="text-xs text-ink/50">· {count} product{count === 1 ? "" : "s"}</span>
          </span>
          <button type="button" onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-sm underline" aria-label={`Rename ${sub.name}`}>
            Rename
          </button>
          <button type="button" onClick={remove} disabled={busy} className="rounded-lg px-2 py-1 text-sm text-red-700 underline" aria-label={`Delete ${sub.name}`}>
            Delete
          </button>
        </>
      )}
    </li>
  );
}
