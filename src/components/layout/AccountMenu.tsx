"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useCartCount } from "@/lib/cart-store";
import { displayEmail } from "@/lib/validation";
import { CartIcon, GaugeIcon, HeartIcon, LogoutIcon } from "./Icons";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const item =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink outline-none transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand";

/**
 * Signed-in account button (avatar + first name) with a dropdown: who is logged in, Admin panel
 * (admins only), Wishlist, Cart and Log out.
 * - Opens on click; closes on outside click, Escape, Tab out or choosing an item.
 * - Does not read the current URL: in the header that would suspend rendering on product pages.
 * - Arrow keys / Home / End move between items; focus returns to the button when closed by keyboard.
 */
export default function AccountMenu({
  name,
  email,
  phone,
  isAdmin,
  onLogout,
}: {
  name: string;
  email: string;
  phone: string;
  isAdmin: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const cartCount = useCartCount();
  const wishlistCount = useWishlist().ids.size;
  const firstName = name.trim().split(/\s+/)[0] || "Account";
  const contact = displayEmail(email) || (phone ? `+91 ${phone}` : "");

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    // Move focus into the menu for keyboard users.
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => items[(i + items.length) % items.length]?.focus();
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[e.key];
    if (target !== undefined) {
      e.preventDefault();
      go(target);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    // Phones: the menu is placed against the (sticky, so positioned) header's right edge, because
    // the avatar sits left of the wishlist/cart/menu icons. Desktop: right under the button.
    <div ref={rootRef} className="lg:relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`group flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:py-1 lg:pl-1 lg:pr-3 ${open ? "bg-black/5" : ""}`}
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-ink ring-2 ring-white sm:h-9 sm:w-9 sm:text-sm"
        >
          {initials(name)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-base font-medium lg:inline">{firstName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`hidden h-4 w-4 text-ink/60 transition-transform duration-200 lg:block ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-4 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] lg:right-0 origin-top-right rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/10 motion-safe:animate-[menu-in_140ms_ease-out]"
        >
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-ink">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              {contact && <p className="truncate text-xs text-ink/60">{contact}</p>}
              {isAdmin && (
                <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="mt-1 space-y-0.5" role="none">
            {isAdmin && (
              <Link href="/admin" role="menuitem" tabIndex={-1} className={item} onClick={() => setOpen(false)}>
                <GaugeIcon className="h-5 w-5 text-ink/60" />
                Admin panel
              </Link>
            )}
            <Link href="/wishlist" role="menuitem" tabIndex={-1} className={item} onClick={() => setOpen(false)}>
              <HeartIcon className="h-5 w-5 text-ink/60" />
              <span className="flex-1">My wishlist</span>
              {wishlistCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{wishlistCount > 99 ? "99+" : wishlistCount}</span>
              )}
            </Link>
            <Link href="/cart" role="menuitem" tabIndex={-1} className={item} onClick={() => setOpen(false)}>
              <CartIcon className="h-5 w-5 text-ink/60" />
              <span className="flex-1">My cart</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </Link>
          </div>

          <div className="my-1 border-t border-black/10" role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`${item} text-red-700 hover:bg-red-50 focus-visible:bg-red-50`}
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
          >
            <LogoutIcon className="h-5 w-5" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
