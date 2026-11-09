import type { ObjectId } from "mongodb";
import type { Category } from "./site";

// ---------------------------------------------------------------------------
// Status values
// ---------------------------------------------------------------------------

export const PAYMENT_STATUSES = ["Pending", "Submitted", "Verified", "Rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHOD = "UPI_QR" as const;

// ---------------------------------------------------------------------------
// MongoDB documents (server side)
// ---------------------------------------------------------------------------

/** One pack size of a product, with its own price, stock and (optional) photos. */
export interface ProductVariant {
  label: string; // e.g. "250 g", "1 kg" (unique within the product)
  price: number;
  salePrice: number | null;
  stock: number;
  images: string[]; // shown first when this pack is selected; empty = use the product photos
}

export interface ProductDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  category: string; // a category slug from settings.categories
  subcategory?: string | null; // optional subcategory slug within that category
  price: number;
  salePrice?: number | null;
  images: string[];
  sizes: string[]; // pack-size labels; with variants, always the variant labels
  stock: number; // with variants: the total of all packs (kept in sync)
  /**
   * Pack sizes with their own price/stock/photos. Empty or missing = a single-price product.
   * With variants, price/salePrice above are the cheapest pack (for "From ₹…" and sorting).
   */
  variants?: ProductVariant[];
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  size: string | null;
  unitPrice: number;
  quantity: number;
}

export interface OrderDoc {
  _id: ObjectId;
  orderNumber: string;
  userId: string; // Firebase UID
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number; // flat shipping charge at the time of the order
  total: number; // subtotal + shipping
  paymentMethod: typeof PAYMENT_METHOD;
  transactionId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_ROLES = ["customer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * An uploaded image (admin uploads). The bytes live here, in their own collection, so product /
 * settings documents only store the short URL ("/media/<id>.<ext>") and stay small.
 */
export interface MediaDoc {
  _id: string; // random hex id, also the file name in the URL
  contentType: "image/jpeg" | "image/png" | "image/webp";
  size: number; // bytes
  folder: "products" | "settings" | "categories";
  data: import("mongodb").Binary;
  uploadedBy: string; // Firebase uid of the admin
  createdAt: Date;
}

/** App user profile. Passwords live in Firebase only — never here. */
export interface UserDoc {
  _id: ObjectId;
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole; // always "customer" on signup; "admin" is granted server-side only
  // Product ids. Kept on the user (no separate collection); only set once the user saves an item.
  wishlist?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Profile returned to the signed-in user. */
export type UserProfile = Pick<UserDoc, "name" | "email" | "phone" | "role">;

/** Store settings — a single document (`_id: "store"`), edited from the admin panel. */
export interface SettingsDoc {
  _id: "store";
  storeName: string;
  logo: string;
  ownerImage: string; // About page photo
  qrCode: string; // payment QR image (site path or /media upload)
  upiId: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  youtube: string; // YouTube channel link ("" = hidden)
  address: string;
  gstNumber: string; // displayed only — no tax calculation
  shippingCharge: number; // flat, added to every order (₹)
  deliveryEstimate: string; // e.g. "3–7 days"
  exchangePolicy: string;
  refundPolicy: string;
  codAvailable: false; // the shop does not offer Cash on Delivery
  categories: Category[]; // shop categories + subcategories (no separate collection)
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Serialized shapes (safe to pass to Client Components)
// ---------------------------------------------------------------------------

export type Product = Omit<ProductDoc, "_id" | "createdAt" | "updatedAt" | "variants"> & {
  id: string;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type Order = Omit<OrderDoc, "_id" | "createdAt" | "updatedAt"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = Omit<SettingsDoc, "_id" | "updatedAt">;

export type UserSummary = Omit<UserDoc, "_id" | "firebaseUid" | "wishlist" | "createdAt" | "updatedAt"> & {
  id: string;
  firebaseUid: string;
  createdAt: string;
};

/** Wishlist page entry. Deactivated products only share their name (no price/link). */
export type WishlistItem =
  | { available: true; product: Product }
  | { available: false; product: Pick<Product, "id" | "name"> };
