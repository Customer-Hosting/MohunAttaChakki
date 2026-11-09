"use client";

import Link from "next/link";
import {
  BagIcon,
  BellIcon,
  BoxIcon,
  GearIcon,
  GridIcon,
  PlusIcon,
  RefreshIcon,
  RupeeIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
} from "@/components/layout/Icons";
import { formatPrice } from "@/lib/format";
import { useAdminStats } from "./AdminStats";
import { Alert, formatDate, Loading, OrderBadge, PaymentBadge } from "./ui";

interface Tile {
  label: string;
  value: string | number;
  href: string;
  icon: (p: { className?: string }) => React.ReactElement;
  hint?: string;
  /** Yellow pill: something is waiting. */
  pill?: string;
}

function StatCard({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <Link
      href={tile.href}
      className="group block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-brand motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/40 text-ink transition-colors group-hover:bg-brand">
          <Icon className="h-5 w-5" />
        </span>
        {tile.pill && <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-ink">{tile.pill}</span>}
      </div>
      <span className="mt-4 block font-display text-3xl font-semibold text-ink">{tile.value}</span>
      <span className="mt-0.5 block text-sm font-medium text-ink/60">{tile.label}</span>
      {tile.hint && <span className="mt-1 block text-xs text-ink/45">{tile.hint}</span>}
    </Link>
  );
}

function Section({ title, text, tiles }: { title: string; text: string; tiles: Tile[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-ink/60">{text}</p>
      <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <StatCard tile={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const { stats, error, loading, refresh } = useAdminStats();

  if (error && !stats) return <Alert>{error}</Alert>;
  if (!stats) return <Loading />;

  const waiting = stats.toVerify + stats.pendingOrders;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 transition-all hover:bg-brand disabled:opacity-60"
        >
          <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Overview */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lg sm:p-8" aria-labelledby="overview-heading">
        <span aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10" />
        <span aria-hidden="true" className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-accent/15" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Overview</p>
            <h2 id="overview-heading" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              {waiting > 0 ? `${waiting} ${waiting === 1 ? "item" : "items"} to look at` : "All caught up"}
            </h2>
            <p className="mt-1 text-white/75">
              {waiting > 0 ? "The yellow pills below show what's waiting." : "No payments to verify and no pending orders."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0"
            >
              <PlusIcon /> New Product
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/20"
            >
              <BagIcon className="h-4 w-4" /> Orders
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/20"
            >
              <GearIcon className="h-4 w-4" /> Settings
            </Link>
          </div>
        </div>
      </section>

      <Section
        title="Orders"
        text="UPI payments to check and deliveries to send."
        tiles={[
          { label: "Payments to verify", value: stats.toVerify, href: "/admin/orders?paymentStatus=Submitted", icon: BellIcon, pill: stats.toVerify ? "Waiting" : undefined },
          { label: "Pending orders", value: stats.pendingOrders, href: "/admin/orders?orderStatus=Pending", icon: BagIcon, pill: stats.pendingOrders ? "New" : undefined },
          { label: "To ship", value: stats.toShip, href: "/admin/orders?orderStatus=Confirmed", icon: TruckIcon, hint: "Confirmed or processing" },
          { label: "Verified sales", value: formatPrice(stats.revenue), href: "/admin/orders?paymentStatus=Verified", icon: RupeeIcon, hint: `${stats.orders} orders in total` },
        ]}
      />

      <Section
        title="Catalog"
        text="What customers see in the shop."
        tiles={[
          { label: "Products", value: `${stats.activeProducts} / ${stats.products}`, href: "/admin/products", icon: TagIcon, hint: "active / total" },
          { label: "Out of stock", value: stats.outOfStock, href: "/admin/products", icon: BoxIcon, pill: stats.outOfStock ? "Restock" : undefined },
          { label: "Categories", value: stats.categories, href: "/admin/categories", icon: GridIcon, hint: `${stats.subcategories} subcategories` },
        ]}
      />

      <Section
        title="Customers"
        text="Registered accounts."
        tiles={[{ label: "Customers", value: stats.users, href: "/admin/users", icon: UsersIcon }]}
      />

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Latest orders</h2>
          <Link href="/admin/orders" className="text-sm font-semibold underline hover:text-accent">
            All orders
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-ink/60">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {stats.recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-brand/20"
                >
                  <span>
                    <span className="font-semibold">{o.orderNumber}</span>
                    <span className="ml-2 text-sm text-ink/60">
                      {o.customerName} · {formatDate(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{formatPrice(o.total)}</span>
                    <PaymentBadge status={o.paymentStatus} />
                    <OrderBadge status={o.orderStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
