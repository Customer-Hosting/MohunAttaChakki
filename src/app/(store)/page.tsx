import type { Metadata } from "next";
import AboutSection from "@/components/home/AboutSection";
import ChakkiSection from "@/components/home/ChakkiSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Hero from "@/components/home/Hero";
import PromoBanners from "@/components/home/PromoBanners";
import ValueSection from "@/components/home/ValueSection";
import { getHomeProducts, getStoreSettings } from "@/lib/catalog";
import { openGraph } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Mohan Atta Chakki — Chakki Fresh Atta, Besan, Sattu & Pulses | Burdwan" },
  description:
    "Mohan Atta Chakki, Burdwan: chakki fresh atta, besan and sattu ground and packed fresh, plus all types of pulses. Pure, fresh and healthy. Pay by UPI.",
  alternates: { canonical: "/" },
  openGraph: openGraph({ title: "Mohan Atta Chakki — Chakki Fresh Atta, Besan, Sattu & Pulses", url: "/" }),
};

export default async function HomePage() {
  const [settings, { products, isFeatured }] = await Promise.all([getStoreSettings(), getHomeProducts(8)]);

  return (
    <>
      <Hero />
      {/* Home shows the four main categories (the first four in the admin's list); all categories are in the shop. */}
      <CategoryGrid categories={settings.categories.slice(0, 4)} />
      <FeaturedProducts products={products} isFeatured={isFeatured} instagram={settings.instagram} />
      <PromoBanners />
      <ChakkiSection storeName={settings.storeName} />
      <AboutSection storeName={settings.storeName} logo={settings.logo || SITE.logo} />
      <ValueSection shippingCharge={settings.shippingCharge} deliveryEstimate={settings.deliveryEstimate} />
    </>
  );
}
