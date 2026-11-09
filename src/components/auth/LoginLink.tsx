"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Link to /login that brings the visitor back to the current page afterwards.
 * The current URL is read at click time (not with usePathname) so pages stay prerenderable.
 * `mode="signup"` opens the signup form.
 */
export default function LoginLink({
  className,
  children,
  onClick,
  mode,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href"> & { mode?: "signup" }) {
  const router = useRouter();
  const href = mode === "signup" ? "/login?mode=signup" : "/login";
  return (
    <Link
      {...rest}
      href={href}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (window.location.pathname === "/login") return;
        event.preventDefault();
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`${href}${href.includes("?") ? "&" : "?"}next=${next}`);
      }}
    >
      {children}
    </Link>
  );
}
