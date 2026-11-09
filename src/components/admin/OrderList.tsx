"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES, type Order } from "@/lib/types";
import { Alert, formatDate, inputClass, Loading, OrderBadge, PageTitle, PaymentBadge } from "./ui";
import { useAdminApi } from "./useAdminApi";

export default function OrderList({ initialPayment = "", initialOrder = "" }: { initialPayment?: string; initialOrder?: string }) {
  const api = useAdminApi();
  const [paymentStatus, setPaymentStatus] = useState(initialPayment);
  const [orderStatus, setOrderStatus] = useState(initialOrder);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; orders: Order[]; total: number; pageCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${paymentStatus}|${orderStatus}|${page}`;

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (orderStatus) params.set("orderStatus", orderStatus);
    let cancelled = false;
    api<{ orders: Order[]; total: number; pageCount: number }>(`/api/admin/orders?${params}`).then((r) => {
      if (cancelled) return;
      if (r.ok) setResult({ key, ...r.data });
      else setError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [api, paymentStatus, orderStatus, page, key]);

  const loading = !result || result.key !== key;

  return (
    <>
      <PageTitle title="Orders" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <label className="text-sm font-medium">
          Payment status
          <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className={inputClass}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "Submitted" ? "Submitted (to verify)" : s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Order status
          <select value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value); setPage(1); }} className={inputClass}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Loading />
      ) : result.orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 p-10 text-center text-sm text-ink/60">No orders found.</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink/60">{result.total} order{result.total === 1 ? "" : "s"}</p>
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white">
            {result.orders.map((o) => (
              <li key={o.id} data-testid="admin-order-row">
                <Link href={`/admin/orders/${o.id}`} className="grid gap-1 p-4 hover:bg-black/[0.02] sm:grid-cols-[1.2fr_1.5fr_auto_auto] sm:items-center sm:gap-4">
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className="text-sm text-ink/70">
                    {o.customerName} · {o.city} · {formatDate(o.createdAt)}
                  </span>
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                  <span className="flex gap-2">
                    <PaymentBadge status={o.paymentStatus} />
                    <OrderBadge status={o.orderStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {result.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">
                ← Prev
              </button>
              <span>
                Page {page} of {result.pageCount}
              </span>
              <button type="button" disabled={page >= result.pageCount} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
