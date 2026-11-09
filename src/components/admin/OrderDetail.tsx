"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { assetUrl } from "@/lib/site";
import { ORDER_STATUSES, PAYMENT_STATUSES, type Order, type OrderStatus, type PaymentStatus } from "@/lib/types";
import { Alert, btnPrimary, Card, formatDate, inputClass, Loading, OrderBadge, PageTitle, PaymentBadge } from "./ui";
import { useAdminStats } from "./AdminStats";
import { useAdminApi } from "./useAdminApi";

export default function OrderDetail({ orderId }: { orderId: string }) {
  const api = useAdminApi();
  const { refresh } = useAdminStats();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Pending");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("Pending");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    api<{ order: Order }>(`/api/admin/orders/${orderId}`).then((r) => {
      if (!r.ok) return setMessage({ kind: "error", text: r.error });
      setOrder(r.data.order);
      setPaymentStatus(r.data.order.paymentStatus);
      setOrderStatus(r.data.order.orderStatus);
    });
  }, [api, orderId]);

  async function save(changes: { paymentStatus?: PaymentStatus; orderStatus?: OrderStatus }, success: string) {
    if (changes.orderStatus === "Cancelled" && order?.orderStatus !== "Cancelled" && !window.confirm("Cancel this order? Its items go back into stock.")) return;
    setBusy(true);
    setMessage(null);
    const r = await api<{ order: Order }>(`/api/admin/orders/${orderId}`, { method: "PATCH", json: changes });
    setBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: r.error });
    setOrder(r.data.order);
    setPaymentStatus(r.data.order.paymentStatus);
    setOrderStatus(r.data.order.orderStatus);
    setMessage({ kind: "success", text: success });
    refresh(); // sidebar badge + bell
  }

  if (!order) return message ? <Alert>{message.text}</Alert> : <Loading />;

  const changed: { paymentStatus?: PaymentStatus; orderStatus?: OrderStatus } = {};
  if (paymentStatus !== order.paymentStatus) changed.paymentStatus = paymentStatus;
  if (orderStatus !== order.orderStatus) changed.orderStatus = orderStatus;

  return (
    <>
      <PageTitle title={`Order ${order.orderNumber}`}>
        <Link href="/admin/orders" className="text-sm font-semibold underline">
          ← All orders
        </Link>
      </PageTitle>
      <p className="-mt-4 mb-5 flex flex-wrap items-center gap-2 text-sm text-ink/70">
        Placed {formatDate(order.createdAt)} · <PaymentBadge status={order.paymentStatus} /> <OrderBadge status={order.orderStatus} />
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-black/5">
              {order.items.map((item, i) => (
                <li key={i} className="flex gap-3 py-3">
                  <span className="relative block h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {item.image && <Image src={assetUrl(item.image)} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-sm text-ink/60">
                      {item.size ? `Pack ${item.size} · ` : ""}
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                  </span>
                  <span className="font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd>{formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="mb-2 font-display text-lg font-semibold">Delivery details</h2>
            <address className="not-italic leading-relaxed">
              <strong>{order.customerName}</strong>
              <br />
              {order.address}
              <br />
              {order.city}, {order.state} – {order.pincode}
            </address>
            <p className="mt-2 text-sm">
              <a href={`tel:+91${order.phone}`} className="underline">+91 {order.phone}</a>
              {order.email && (
                <>
                  {" · "}
                  <a href={`mailto:${order.email}`} className="underline">{order.email}</a>
                </>
              )}
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 font-display text-lg font-semibold">Payment (UPI / QR)</h2>
            <p className="text-sm text-ink/70">Check this transaction ID in the shop’s UPI app before verifying.</p>
            <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 font-mono text-base" data-testid="transaction-id">
              {order.transactionId || "— not provided —"}
            </p>
            <p className="mt-2 text-sm">
              Amount expected: <strong>{formatPrice(order.total)}</strong>
            </p>
            {order.paymentStatus !== "Verified" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => save({ paymentStatus: "Verified", ...(order.orderStatus === "Pending" ? { orderStatus: "Confirmed" } : {}) }, "Payment verified and order confirmed.")} className={btnPrimary}>
                  Verify payment
                </button>
                {order.paymentStatus !== "Rejected" && (
                  <button type="button" disabled={busy} onClick={() => save({ paymentStatus: "Rejected" }, "Payment marked as rejected.")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                    Reject payment
                  </button>
                )}
              </div>
            )}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Update status</h2>
            <label className="block text-sm font-medium">
              Payment status
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className={inputClass}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Order status
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value as OrderStatus)} className={inputClass}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy || Object.keys(changed).length === 0} onClick={() => save(changed, "Order updated.")} className={`${btnPrimary} w-full py-3`}>
              {busy ? "Saving…" : "Save status"}
            </button>
            <p className="text-xs text-ink/60">Cancelling returns the items to stock. Customers are not notified automatically.</p>
          </Card>
          <div aria-live="polite">{message && <Alert kind={message.kind}>{message.text}</Alert>}</div>
        </div>
      </div>
    </>
  );
}
