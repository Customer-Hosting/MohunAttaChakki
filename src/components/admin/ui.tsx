// Small presentational helpers shared by the admin pages.
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const inputClass =
  "mt-1 block w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-brand";
export const btnPrimary =
  "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-semibold hover:border-ink disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: React.ReactNode }) {
  const tone =
    kind === "error" ? "bg-red-50 text-red-700" : kind === "success" ? "bg-green-50 text-green-800" : "bg-neutral-100 text-ink/80";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${tone}`}>
      {children}
    </p>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-black/10 bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-ink/60">{label}</p>;
}

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  Pending: "bg-neutral-100 text-ink/70",
  Submitted: "bg-amber-100 text-amber-900",
  Verified: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};
const ORDER_TONE: Record<OrderStatus, string> = {
  Pending: "bg-neutral-100 text-ink/70",
  Confirmed: "bg-blue-100 text-blue-800",
  Processing: "bg-indigo-100 text-indigo-800",
  Shipped: "bg-purple-100 text-purple-800",
  Delivered: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_TONE[status]}`}>{status}</span>;
}
export function OrderBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_TONE[status]}`}>{status}</span>;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}
