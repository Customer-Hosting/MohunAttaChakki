"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LoginLink from "@/components/auth/LoginLink";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useCartCount } from "@/lib/cart-store";
import { assetUrl, NAV_LINKS } from "@/lib/site";
import AccountMenu from "./AccountMenu";
import { phoneHref } from "./contact";
import { CartIcon, CloseIcon, HeartIcon, MailIcon, MenuIcon, PhoneIcon, TruckIcon, UserIcon } from "./Icons";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

type NavVariant = "desktop" | "mobile";

function NavLinkList({ pathname, variant, onNavigate }: { pathname: string | null; variant: NavVariant; onNavigate?: () => void }) {
  return NAV_LINKS.map((link) =>
    variant === "desktop" ? (
      <Link
        key={link.href}
        href={link.href}
        className={`relative py-1 text-base font-medium transition-colors xl:text-[17px] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:text-accent hover:after:scale-x-100 motion-reduce:after:transition-none ${isActive(pathname, link.href) ? "text-accent after:scale-x-100" : "text-ink after:scale-x-0"}`}
      >
        {link.label}
      </Link>
    ) : (
      <li key={link.href}>
        <Link
          href={link.href}
          onClick={onNavigate}
          className={`block rounded-md px-2 py-3 text-base font-medium transition-colors ${isActive(pathname, link.href) ? "bg-brand" : "hover:bg-black/5 hover:pl-3"}`}
        >
          {link.label}
        </Link>
      </li>
    ),
  );
}

/**
 * Only the active-link highlight needs the current path. Reading it suspends on pages with
 * dynamic params (e.g. /shop/[slug]), so it sits in its own Suspense boundary and the rest of
 * the header stays prerendered. The fallback is the same links without highlighting.
 */
function NavLinks(props: { variant: NavVariant; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavLinkList pathname={null} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

function ActiveNavLinks(props: { variant: NavVariant; onNavigate?: () => void }) {
  return <NavLinkList pathname={usePathname()} {...props} />;
}

export interface HeaderProps {
  storeName: string;
  email: string;
  phone: string;
  logo: string;
}

export default function Header({ storeName, email, phone, logo }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { status, profile, logOut } = useAuth();
  const cartCount = useCartCount();
  // Saved products of the signed-in user (0 for guests). Updates instantly when a heart is toggled.
  const wishlistCount = useWishlist().ids.size;
  const firstName = profile?.name.split(" ")[0] ?? "Account";

  async function handleLogout() {
    setOpen(false);
    await logOut();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      {/* Top strip, as on the reference site */}
      <div className="bg-brand text-xs font-medium text-ink sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:py-2">
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-x-5">
            <a href={`mailto:${email}`} className="flex min-w-0 items-center gap-1.5 hover:underline">
              <MailIcon className="h-4 w-4" />
              {email}
            </a>
            {phone && (
              <a href={phoneHref(phone)} className="flex items-center gap-1.5 hover:underline">
                <PhoneIcon className="h-4 w-4" />
                {phone}
              </a>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <TruckIcon className="h-4 w-4" />
            Fresh home delivery
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:h-24">
        <Link href="/" aria-label={`${storeName} — Home`} className="flex min-w-0 items-center" onClick={() => setOpen(false)}>
          <Image
            src={assetUrl(logo)}
            alt=""
            width={126}
            height={84}
            priority
            className="h-11 w-auto shrink-0 object-contain sm:h-[4.5rem]"
          />
          <span className="ml-2 hidden min-w-0 leading-tight min-[360px]:block">
            <span className="block font-display text-[15px] font-bold leading-tight text-ink sm:text-2xl">{storeName}</span>
            <span className="hidden text-xs font-medium tracking-wide text-accent sm:block">Pure · Fresh · Healthy</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Main">
          <NavLinks variant="desktop" />
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* Account — nothing rendered while Firebase restores the session (no flash of "Log in") */}
          {status === "unauthenticated" && (
            <LoginLink className="mr-2 hidden rounded-full border-2 border-ink px-5 py-2 text-base font-semibold transition-colors hover:bg-ink hover:text-white lg:inline-block">
              Log in
            </LoginLink>
          )}
          {status === "authenticated" && (
            <div className="mr-1 lg:mr-2">
              <AccountMenu
                name={profile?.name ?? firstName}
                email={profile?.email ?? ""}
                phone={profile?.phone ?? ""}
                isAdmin={profile?.role === "admin"}
                onLogout={handleLogout}
              />
            </div>
          )}
          {status === "unauthenticated" && (
            <LoginLink aria-label="Log in" className="rounded-full p-2 transition-colors hover:bg-black/5 lg:hidden">
              <UserIcon />
            </LoginLink>
          )}
          <Link
            href="/wishlist"
            aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? "item" : "items"}` : "Wishlist"}
            className="group relative flex items-center gap-1.5 rounded-full p-2 transition-colors hover:bg-black/5 hover:text-accent"
          >
            <HeartIcon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100 sm:h-7 sm:w-7" />
            <span aria-hidden="true" className="hidden text-base font-medium xl:inline">Wishlist</span>
            {wishlistCount > 0 && (
              <span aria-hidden="true" className="absolute left-5 -top-0.5 grid h-5 min-w-5 sm:left-6 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
            className="group relative flex items-center gap-1.5 rounded-full p-2 transition-colors hover:bg-black/5 hover:text-accent"
          >
            <CartIcon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100 sm:h-7 sm:w-7" />
            <span aria-hidden="true" className="hidden text-base font-medium xl:inline">Cart</span>
            {cartCount > 0 && (
              <span aria-hidden="true" className="absolute left-5 -top-0.5 grid h-5 min-w-5 sm:left-6 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-black/5 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-black/10 lg:hidden" aria-label="Mobile">
          <ul className="mx-auto max-w-7xl px-4 py-2">
            <NavLinks variant="mobile" onNavigate={() => setOpen(false)} />
            <li>
              <Link href="/wishlist" onClick={() => setOpen(false)} className="block rounded-md px-2 py-3 text-base font-medium hover:bg-black/5">
                Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
              </Link>
            </li>
            <li>
              <Link href="/cart" onClick={() => setOpen(false)} className="block rounded-md px-2 py-3 text-base font-medium hover:bg-black/5">
                Cart{cartCount > 0 ? ` (${cartCount})` : ""}
              </Link>
            </li>
            <li className="mt-2 border-t border-black/10 pt-2">
              {status === "authenticated" ? (
                <>
                  <p className="px-2 py-2 text-sm text-ink/70">Logged in as {profile?.name ?? "…"}</p>
                  {profile?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-2 py-3 text-base font-medium hover:bg-black/5"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-md px-2 py-3 text-left text-base font-medium hover:bg-black/5"
                  >
                    Log out
                  </button>
                </>
              ) : status === "unauthenticated" ? (
                <LoginLink
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-3 text-base font-medium hover:bg-black/5"
                >
                  Log in / Sign up
                </LoginLink>
              ) : null}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
