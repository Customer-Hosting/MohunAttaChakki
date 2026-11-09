import { getStoreSettings } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import FloatingButtons from "./FloatingButtons";
import Footer from "./Footer";
import Header from "./Header";

/** Store header + footer around customer-facing pages (the admin area has its own chrome). */
export default async function StoreChrome({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <>
      <Header storeName={settings.storeName} email={settings.email} phone={settings.phone} logo={settings.logo || SITE.logo} />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingButtons phone={settings.phone} storeName={settings.storeName} />
    </>
  );
}
