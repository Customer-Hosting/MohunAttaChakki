import type { Metadata, Viewport } from "next";
import { Geist, Jost } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { openGraph } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headings use Jost, the font used on the reference website.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Chakki Fresh Atta, Besan, Sattu & Pulses`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: openGraph({}),
};

export const viewport: Viewport = {
  themeColor: "#14361f",
};

// Store pages get their header/footer from app/(store)/layout.tsx; /admin has its own.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: globals.css uses smooth scrolling; this lets Next.js turn it off during
    // page changes so navigation jumps straight to the top (and silences the dev warning).
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
