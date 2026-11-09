"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Settings } from "@/lib/types";
import ChangePasswordCard from "./ChangePasswordCard";
import ImagePicker from "./ImagePicker";
import { Alert, btnPrimary, Card, inputClass, Loading, PageTitle } from "./ui";
import { useAdminApi } from "./useAdminApi";

type Editable = Omit<Settings, "categories" | "codAvailable">;

const TEXT_FIELDS: { key: keyof Editable; label: string; type?: string; hint?: string }[] = [
  { key: "storeName", label: "Store name" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone / WhatsApp", type: "tel" },
  { key: "instagram", label: "Instagram link", type: "url" },
  { key: "facebook", label: "Facebook link", type: "url" },
  { key: "youtube", label: "YouTube link", type: "url", hint: "Your channel, e.g. https://www.youtube.com/@yourchannel. Leave empty to hide it." },
  { key: "gstNumber", label: "GST number", hint: "Shown on the About and Contact pages. No tax is calculated." },
];

export default function SettingsForm() {
  const api = useAdminApi();
  const [form, setForm] = useState<Editable | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings").then((r) => {
      if (!r.ok) return setMessage({ kind: "error", text: r.error });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { categories, codAvailable, ...rest } = r.data.settings;
      setForm(rest);
    });
  }, [api]);

  if (!form) return message ? <Alert>{message.text}</Alert> : <Loading />;
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const r = await api<{ settings: Settings }>("/api/admin/settings", { method: "PUT", json: form });
    setBusy(false);
    setMessage(r.ok ? { kind: "success", text: "Settings saved. The website is updated." } : { kind: "error", text: r.error });
  }

  return (
    <>
      <PageTitle title="Store settings" />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2" noValidate>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Payment (UPI / QR)</h2>
          <ImagePicker label="Payment QR code" folder="settings" max={1} value={form.qrCode ? [form.qrCode] : []} onChange={(v) => set("qrCode", v[0] ?? "")} />
          <p className="-mt-2 text-xs text-ink/60">Upload a new QR to replace the current one. If removed, checkout shows the shop’s default QR.</p>
          <label className="block text-sm font-medium">
            UPI ID <span className="font-normal text-ink/50">(shown under the QR at checkout)</span>
            <input value={form.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="shopname@okaxis" className={inputClass} />
          </label>
          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm">
            Cash on Delivery: <strong>not available</strong> (this website accepts UPI / QR payments only).
          </p>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Delivery &amp; policies</h2>
          <label className="block text-sm font-medium">
            Shipping charge (₹ per order)
            <input type="number" min={0} step={1} value={form.shippingCharge} onChange={(e) => set("shippingCharge", e.target.value === "" ? 0 : Number(e.target.value))} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Estimated delivery
            <input value={form.deliveryEstimate} onChange={(e) => set("deliveryEstimate", e.target.value)} maxLength={40} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Damaged-pack / exchange policy
            <textarea value={form.exchangePolicy} onChange={(e) => set("exchangePolicy", e.target.value)} rows={2} maxLength={500} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Refund policy
            <textarea value={form.refundPolicy} onChange={(e) => set("refundPolicy", e.target.value)} rows={2} maxLength={500} className={inputClass} />
          </label>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Store details</h2>
          {TEXT_FIELDS.map((f) => (
            <label key={f.key} className="block text-sm font-medium">
              {f.label}
              <input type={f.type ?? "text"} value={String(form[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value as never)} className={inputClass} />
              {f.hint && <span className="mt-1 block text-xs font-normal text-ink/60">{f.hint}</span>}
            </label>
          ))}
          <label className="block text-sm font-medium">
            Address
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} maxLength={300} className={inputClass} />
          </label>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-display text-lg font-semibold">Images</h2>
          <ImagePicker label="Logo" folder="settings" max={1} value={form.logo ? [form.logo] : []} onChange={(v) => set("logo", v[0] ?? "")} />
          <ImagePicker label="Owner photo (About page)" folder="settings" max={1} value={form.ownerImage ? [form.ownerImage] : []} onChange={(v) => set("ownerImage", v[0] ?? "")} />
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <div aria-live="polite">{message && <Alert kind={message.kind}>{message.text}</Alert>}</div>
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3 sm:w-auto sm:px-10`}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      {/* Separate form: password changes go to Firebase, not the store settings API. */}
      <ChangePasswordCard />
    </>
  );
}
