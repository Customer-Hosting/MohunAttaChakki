import StoreChrome from "@/components/layout/StoreChrome";

// Customer pages (Home, Shop, Product, Wishlist, Cart, Login). URLs are unchanged by the (store) group.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreChrome>{children}</StoreChrome>;
}
