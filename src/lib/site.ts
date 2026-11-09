// Business identity — supplied by the client (see README). Do not change without the client's confirmation.

export const SITE = {
  name: "Mohan Atta Chakki",
  tagline: "Pure · Fresh · Healthy",
  description:
    "Mohan Atta Chakki in Burdwan grinds fresh chakki atta, besan and sattu, and deals in all types of pulses. Every batch is ground in a clean, hygienic chakki and packed fresh under our Mac Computer Brand, so your family gets pure goodness, naturally.",
  email: "khandelwal.nilay@zohomail.com",
  phone: "+91 97348 61080",
  address: "Sasan Para, Talit, Burdwan, West Bengal",
  gstNumber: "",
  /** FSSAI food licence printed on every pack. */
  fssai: "12821022000229",
  logo: "/brand/logo.png",
  /** Square version of the logo for link previews (Open Graph). */
  ogImage: "/brand/logo-square.png",
  ownerImage: "/images/about-chakki.jpg",
  /** Shop's UPI (BHIM) payment QR shown at checkout. The admin can replace it in Admin → Settings. */
  qrCode: "/images/payment-qr.png",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  social: {
    instagram: "",
    facebook: "",
    youtube: "",
  },
} as const;

/** Main navigation (header). Wishlist, Cart and Account are icons in the header. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

/** Footer "Useful links". */
export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact Us" },
] as const;

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string; // site path or https URL; "" for none
  subcategories: Subcategory[];
}

const sub = (name: string, slug: string, parent: string): Subcategory => ({ id: `${parent}--${slug}`, name, slug });

/**
 * Starting categories. The live list is stored in the settings document and managed by the
 * admin (/admin/categories), so these are only used until the admin saves changes.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "atta",
    name: "Atta & Flour",
    slug: "atta",
    image: "/images/products/atta-front.jpeg",
    subcategories: [sub("Chakki Fresh Atta", "chakki-atta", "atta"), sub("Maida", "maida", "atta"), sub("Sooji", "sooji", "atta")],
  },
  {
    id: "besan",
    name: "Besan",
    slug: "besan",
    image: "/images/products/besan-front.jpeg",
    subcategories: [sub("Matar Besan", "matar-besan", "besan"), sub("Chana Besan", "chana-besan", "besan")],
  },
  {
    id: "sattu",
    name: "Sattu",
    slug: "sattu",
    image: "/images/products/sattu-front.jpeg",
    subcategories: [sub("Chana Sattu", "chana-sattu", "sattu")],
  },
  {
    id: "pulses",
    name: "Pulses & Dal",
    slug: "pulses",
    image: "/images/products/pulses-front.jpeg",
    subcategories: [
      sub("Chana Dal", "chana-dal", "pulses"),
      sub("Masoor Dal", "masoor-dal", "pulses"),
      sub("Moong Dal", "moong-dal", "pulses"),
      sub("Arhar / Toor Dal", "toor-dal", "pulses"),
      sub("Rajma & Beans", "rajma", "pulses"),
      sub("Other Pulses", "other", "pulses"),
    ],
  },
  {
    id: "snacks",
    name: "Roasted Snacks",
    slug: "snacks",
    image: "/images/products/roasted-chana-front.jpeg",
    subcategories: [sub("Roasted Chana", "roasted-chana", "snacks")],
  },
];

/**
 * Default "pack size" for a new product. The site keeps the original "sizes" field, but for a
 * grocery shop it holds the pack weight. One price is shared by every size of a product, so each
 * weight with its own price (1 kg, 5 kg…) is a separate product with a single pack size.
 */
export function defaultSizesFor(category: string): string[] {
  void category;
  return [];
}

export function findCategory(categories: Category[], slug: string | null | undefined): Category | undefined {
  return slug ? categories.find((c) => c.slug === slug) : undefined;
}

export function categoryName(slug: string, categories: Category[]): string {
  return findCategory(categories, slug)?.name ?? slug;
}

export function subcategoryName(categorySlug: string, subSlug: string, categories: Category[]): string {
  return findCategory(categories, categorySlug)?.subcategories.find((s) => s.slug === subSlug)?.name ?? subSlug;
}

/** Image paths in /public may contain spaces; encode them for URLs (next/image, links). */
export function assetUrl(path: string): string {
  return path.startsWith("/") ? encodeURI(decodeURI(path)) : path;
}
