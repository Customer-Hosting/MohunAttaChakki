"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LoginLink from "@/components/auth/LoginLink";
import { clearCart, removeFromCart, setCartQuantity, useCart, type CartItem } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { assetUrl } from "@/lib/site";
import type { Order } from "@/lib/types";

export interface CheckoutInfo {
  storeName: string;
  qrCode: string;
  upiId: string;
  shippingCharge: number;
  deliveryEstimate: string;
  exchangePolicy: string;
  refundPolicy: string;
  codNotice: string;
  deliveryNotice: string;
  paymentNotice: string;
  phone: string;
}

interface QuotedLine {
  productId: string;
  size: string | null;
  quantity: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  stock: number;
  problem: string | null;
}
interface Quote {
  lines: QuotedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  ok: boolean;
}

interface Details {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-black/20 bg-white px-3 py-2.5 text-base outline-none focus:border-ink focus:ring-2 focus:ring-brand";

const lineKey = (i: Pick<CartItem, "productId" | "size">) => `${i.productId}|${i.size ?? ""}`;

export default function CartView({ info }: { info: CheckoutInfo }) {
  const cart = useCart();
  const { status, profile, authFetch } = useAuth();
  const [quote, setQuote] = useState<{ key: string; data: Quote } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [step, setStep] = useState<"cart" | "details" | "payment">("cart");
  const [details, setDetails] = useState<Details | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);

  const cartKey = useMemo(() => cart.map((i) => `${lineKey(i)}:${i.quantity}`).join(","), [cart]);

  // Re-price whenever the cart changes. Prices/stock always come from the server.
  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart.map(({ productId, size, quantity }) => ({ productId, size, quantity })) }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load your cart.");
        setQuote({ key: cartKey, data });
        setQuoteError(null);
      } catch (err) {
        if (!cancelled) setQuoteError(err instanceof Error ? err.message : "Could not load your cart.");
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cart, cartKey]);

  // ---- order placed --------------------------------------------------------
  if (placed) return <Confirmation order={placed} info={info} />;

  // ---- empty ---------------------------------------------------------------
  if (cart.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 px-6 py-14 text-center">
        <p className="font-display text-xl font-semibold">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">Browse the shop and add something you like.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark">
          Browse the shop
        </Link>
      </div>
    );
  }

  const q = quote && quote.key === cartKey ? quote.data : null;
  const qByKey = new Map(q?.lines.map((l) => [lineKey(l), l]) ?? []);

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!details || placing) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await authFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
          details,
          transactionId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.quote) {
        setQuote({ key: cartKey, data: data.quote });
        setStep("cart");
        setError(data.error);
      } else if (!res.ok) {
        setError(data.error || "Could not place your order. Please try again.");
      } else {
        setPlaced(data.order);
        clearCart();
        window.scrollTo({ top: 0 });
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* ---------------- items ---------------- */}
      <div>
        {quoteError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{quoteError}</p>}
        {error && step === "cart" && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10" aria-busy={!q}>
          {cart.map((item) => {
            const line = qByKey.get(lineKey(item));
            const max = line ? Math.max(1, Math.min(line.stock, 10)) : 10;
            return (
              <li key={lineKey(item)} className="flex gap-3 p-3 sm:gap-4 sm:p-4" data-testid="cart-line">
                <Link href={`/shop/${item.slug}`} className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:w-24" tabIndex={-1}>
                  {line?.image && <Image src={assetUrl(line.image)} alt="" fill sizes="96px" className="object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/shop/${item.slug}`} className="font-medium hover:text-accent">
                      {line?.name ?? "Loading…"}
                    </Link>
                    <span className="shrink-0 font-semibold">{line && !line.problem ? formatPrice(line.lineTotal) : ""}</span>
                  </div>
                  <p className="text-sm text-ink/60">
                    {item.size ? `Pack ${item.size}` : ""}
                    {line && line.unitPrice > 0 && (
                      <>
                        {item.size ? " · " : ""}
                        {formatPrice(line.unitPrice)} each
                        {line.originalPrice > line.unitPrice && <s className="ml-1 text-ink/40">{formatPrice(line.originalPrice)}</s>}
                      </>
                    )}
                  </p>
                  {line?.problem && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{line.problem}</p>}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="inline-flex items-center rounded-lg border border-black/20" role="group" aria-label={`Quantity for ${line?.name ?? "item"}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1 || step !== "cart"} onClick={() => setCartQuantity(item, item.quantity - 1)} className="h-9 w-9 disabled:opacity-40">
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold" data-testid="cart-qty">{item.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={item.quantity >= max || step !== "cart"} onClick={() => setCartQuantity(item, item.quantity + 1)} className="h-9 w-9 disabled:opacity-40">
                        +
                      </button>
                    </div>
                    <button type="button" onClick={() => removeFromCart(item)} disabled={step === "payment"} className="text-sm text-ink/70 underline hover:text-red-700 disabled:opacity-40" aria-label={`Remove ${line?.name ?? "item"} from cart`}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/shop" className="mt-4 inline-block text-sm font-semibold underline">
          ← Continue shopping
        </Link>
      </div>

      {/* ---------------- summary + checkout ---------------- */}
      <div className="space-y-5">
        <section aria-labelledby="summary-heading" className="rounded-2xl border border-black/10 p-5">
          <h2 id="summary-heading" className="font-display text-lg font-semibold">Order summary</h2>
          <dl className="mt-3 space-y-1.5 text-sm" data-testid="order-summary">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{q ? formatPrice(q.subtotal) : "…"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{q ? formatPrice(q.shipping) : formatPrice(info.shippingCharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="order-total">{q ? formatPrice(q.total) : "…"}</dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-1 text-xs text-ink/70">
            <li>{info.deliveryNotice} Estimated delivery: {info.deliveryEstimate}.</li>
            <li>{info.exchangePolicy}</li>
            <li>{info.refundPolicy}</li>
            <li>{info.codNotice} {info.paymentNotice}</li>
          </ul>
        </section>

        {/* step 1: login / continue */}
        {step === "cart" && (
          <section className="rounded-2xl border border-black/10 p-5">
            {status === "unauthenticated" ? (
              <>
                <h2 className="font-display text-lg font-semibold">Checkout</h2>
                <p className="mt-1 text-sm text-ink/70">Please log in or create an account to place your order. Your cart will be kept.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <LoginLink className="rounded-full bg-ink px-6 py-3 text-center text-sm font-semibold text-white hover:bg-accent">Log in to checkout</LoginLink>
                  <LoginLink mode="signup" className="rounded-full border border-black/20 px-6 py-3 text-center text-sm font-semibold hover:border-ink">
                    Create account
                  </LoginLink>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={!q?.ok || status !== "authenticated"}
                onClick={() => {
                  setDetails((d) => d ?? { customerName: profile?.name ?? "", phone: profile?.phone ?? "", email: profile?.email ?? "", address: "", city: "", state: "", pincode: "" });
                  setStep("details");
                  setError(null);
                }}
                className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:bg-black/30"
              >
                {q && !q.ok ? "Fix the items above to continue" : "Proceed to checkout"}
              </button>
            )}
          </section>
        )}

        {/* step 2: delivery details */}
        {step === "details" && details && (
          <DeliveryForm
            details={details}
            onBack={() => setStep("cart")}
            onSubmit={(d) => {
              setDetails(d);
              setStep("payment");
              setError(null);
            }}
          />
        )}

        {/* step 3: QR payment */}
        {step === "payment" && details && q && (
          <form onSubmit={placeOrder} className="space-y-4 rounded-2xl border-2 border-ink p-5" aria-labelledby="pay-heading">
            <h2 id="pay-heading" className="font-display text-lg font-semibold">Pay {formatPrice(q.total)} by UPI</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
              <li>Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM…).</li>
              <li>Pay exactly <strong>{formatPrice(q.total)}</strong>.</li>
              <li>Enter the UPI transaction / UTR number below and place your order.</li>
            </ol>
            {info.qrCode ? (
              <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-xl border border-black/10 bg-white">
                <Image src={assetUrl(info.qrCode)} alt={`UPI payment QR code for ${info.storeName}`} fill sizes="260px" className="object-contain" />
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm">The payment QR code isn’t available right now. Please contact us on {info.phone}.</p>
            )}
            {info.upiId && (
              <p className="text-center text-sm">
                UPI ID: <strong className="select-all font-mono">{info.upiId}</strong>
                <a
                  href={`upi://pay?pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.storeName)}&am=${q.total}&cu=INR`}
                  className="mt-2 block rounded-full border border-black/20 px-4 py-2 font-semibold sm:hidden"
                >
                  Pay with UPI app
                </a>
              </p>
            )}
            <label className="block text-sm font-medium">
              UPI transaction ID / UTR
              <input
                name="transactionId"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                inputMode="text"
                autoComplete="off"
                maxLength={40}
                placeholder="e.g. 412356789012"
                className={inputClass}
              />
              <span className="mt-1 block text-xs font-normal text-ink/60">Find it in your UPI app’s payment history. The shop verifies every payment manually.</span>
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("details")} className="rounded-full border border-black/20 px-5 py-3 text-sm font-semibold">
                Back
              </button>
              <button type="submit" disabled={placing || transactionId.trim().length < 6} className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:bg-black/30">
                {placing ? "Placing order…" : "I have paid — place order"}
              </button>
            </div>
            <p className="text-xs text-ink/60">Delivering to {details.customerName}, {details.city} {details.pincode}.</p>
          </form>
        )}
      </div>
    </div>
  );
}

function DeliveryForm({ details, onBack, onSubmit }: { details: Details; onBack: () => void; onSubmit: (d: Details) => void }) {
  const [d, setD] = useState(details);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof Details, value: string) => setD((x) => ({ ...x, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    // Light checks here; the server validates everything again.
    const phone = d.phone.replace(/[\s()-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
    if (d.customerName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Please enter a valid 10-digit mobile number.");
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return setError("Please enter a valid email address, or leave it empty.");
    if (d.address.trim().length < 5) return setError("Please enter your full address.");
    if (d.city.trim().length < 2 || d.state.trim().length < 2) return setError("Please enter your city and state.");
    if (!/^[1-9]\d{5}$/.test(d.pincode.trim())) return setError("Please enter a valid 6-digit pincode.");
    onSubmit({ ...d, phone });
  }

  const field = (key: keyof Details, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-medium">
      {label}
      <input name={key} value={d[key]} onChange={(e) => set(key, e.target.value)} required className={inputClass} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border-2 border-ink p-5" noValidate aria-labelledby="delivery-heading">
      <h2 id="delivery-heading" className="font-display text-lg font-semibold">Delivery details</h2>
      {field("customerName", "Full name", { autoComplete: "name", maxLength: 80 })}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("phone", "Mobile number", { type: "tel", inputMode: "numeric", autoComplete: "tel-national", maxLength: 14 })}
        {field("email", "Email (optional)", { type: "email", autoComplete: "email", required: false })}
      </div>
      <label className="block text-sm font-medium">
        Address (house, street, area)
        <textarea name="address" value={d.address} onChange={(e) => set("address", e.target.value)} required rows={2} maxLength={300} autoComplete="street-address" className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {field("city", "City", { autoComplete: "address-level2", maxLength: 60 })}
        {field("state", "State", { autoComplete: "address-level1", maxLength: 60 })}
        {field("pincode", "Pincode", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 6 })}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="rounded-full border border-black/20 px-5 py-3 text-sm font-semibold">
          Back
        </button>
        <button type="submit" className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-accent">
          Continue to payment
        </button>
      </div>
    </form>
  );
}

function Confirmation({ order, info }: { order: Order; info: CheckoutInfo }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-black/10 p-6 text-center sm:p-8" data-testid="order-confirmation">
      <p className="text-4xl" aria-hidden="true">✓</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">Thank you! Your order is placed.</h2>
      <p className="mt-2 text-ink/70">
        Order number <strong className="text-ink">{order.orderNumber}</strong>
      </p>
      <dl className="mx-auto mt-5 max-w-sm space-y-1 text-left text-sm">
        <div className="flex justify-between">
          <dt>Items</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{formatPrice(order.shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-1 font-semibold">
          <dt>Total paid</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Transaction ID</dt>
          <dd className="font-mono">{order.transactionId}</dd>
        </div>
      </dl>
      <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm">
        Payment submitted — the shop will verify it and confirm your order. Estimated delivery after confirmation: {info.deliveryEstimate}.
      </p>
      <ul className="mt-4 space-y-1 text-xs text-ink/70">
        <li>{info.exchangePolicy}</li>
        <li>{info.refundPolicy} {info.codNotice}</li>
        <li>Questions? Call or WhatsApp {info.phone}.</li>
      </ul>
      <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark">
        Continue shopping
      </Link>
    </div>
  );
}
