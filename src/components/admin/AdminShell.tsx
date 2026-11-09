"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  BagIcon,
  BellIcon,
  CloseIcon,
  ExternalIcon,
  GaugeIcon,
  GearIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  TagIcon,
  UsersIcon,
} from "@/components/layout/Icons";
import { SITE } from "@/lib/site";
import { AdminStatsProvider, useAdminStats } from "./AdminStats";

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactElement; badge?: "toVerify" | "outOfStock" };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: GaugeIcon },
      { href: "/admin/orders", label: "Orders", icon: BagIcon, badge: "toVerify" },
      { href: "/admin/users", label: "Users", icon: UsersIcon },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: TagIcon, badge: "outOfStock" },
      { href: "/admin/categories", label: "Categories", icon: GridIcon },
    ],
  },
  { title: "Store", items: [{ href: "/admin/settings", label: "Settings", icon: GearIcon }] },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  const { stats } = useAdminStats();
  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const count = item.badge && stats ? stats[item.badge] : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-all duration-200 ${
                      active ? "bg-brand text-ink shadow-sm" : "text-white/80 hover:translate-x-1 hover:bg-white/10 hover:text-white motion-reduce:hover:translate-x-0"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                        active ? "bg-ink/10" : "bg-white/10 group-hover:bg-white/15"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white"
                        aria-label={item.badge === "toVerify" ? `${count} payments to verify` : `${count} out of stock`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ActiveNavList(props: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} {...props} />;
}

/** Active state needs the URL, which suspends on dynamic admin routes → isolated in Suspense. */
function Nav(props: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname={null} {...props} />}>
      <ActiveNavList {...props} />
    </Suspense>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white p-1">
          <Image src={SITE.logo} alt="" width={40} height={40} priority className="h-10 w-10 object-contain" />
        </span>
        <span>
          <span className="block font-display text-xl font-semibold text-white">Admin</span>
          <span className="block text-xs text-white/60">{SITE.name}</span>
        </span>
      </Link>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:thin]">
        <Nav onNavigate={onNavigate} />
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-brand"
        >
          <ExternalIcon /> View site
        </Link>
      </div>
    </div>
  );
}

function TopBar({ email, onMenu, onLogout }: { email?: string; onMenu: () => void; onLogout: () => void }) {
  const { stats } = useAdminStats();
  const alerts = (stats?.toVerify ?? 0) + (stats?.outOfStock ?? 0);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open admin menu"
          aria-controls="admin-drawer"
          className="rounded-lg p-2 transition-colors hover:bg-black/5 lg:hidden"
        >
          <MenuIcon />
        </button>
        <span className="font-display text-lg font-semibold lg:hidden">Admin</span>
        <span className="hidden text-sm text-ink/50 lg:inline">
          {SITE.name} · <span className="font-semibold text-ink">Admin</span>
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href={stats?.toVerify ? "/admin/orders?paymentStatus=Submitted" : "/admin"}
          aria-label={alerts ? `${alerts} items need attention` : "No new alerts"}
          className="relative grid h-11 w-11 place-items-center rounded-xl bg-neutral-100 transition-colors hover:bg-brand"
        >
          <BellIcon />
          {alerts > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
              {alerts}
            </span>
          )}
        </Link>
        <span className="hidden text-sm text-ink/70 md:inline">{email}</span>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-white"
        >
          <LogoutIcon /> Log out
        </button>
      </div>
    </header>
  );
}

/** Admin layout: dark sidebar (drawer on small screens), top bar with alerts, content area. */
export default function AdminShell({ email, onLogout, children }: { email?: string; onLogout: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AdminStatsProvider>
      <div className="min-h-screen bg-neutral-100 lg:pl-72">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-ink lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" id="admin-drawer">
            <button type="button" aria-label="Close admin menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink shadow-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close admin menu"
                className="absolute right-3 top-6 rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <TopBar email={email} onMenu={() => setOpen(true)} onLogout={onLogout} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </AdminStatsProvider>
  );
}
