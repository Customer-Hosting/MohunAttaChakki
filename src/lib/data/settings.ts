import "server-only";
import { content } from "../../content/en";
import { collections } from "../db";
import { slugify } from "../format";
import { DEFAULT_CATEGORIES, SITE, type Category, type Subcategory } from "../site";
import type { Settings } from "../types";
import { EMAIL_PATTERN, trimmedString, urlOrEmpty, ValidationError } from "./common";

export const SETTINGS_ID = "store" as const;

/** Used until the admin saves settings. Values supplied by the client. */
export const DEFAULT_SETTINGS: Settings = {
  storeName: SITE.name,
  logo: SITE.logo,
  ownerImage: SITE.ownerImage,
  qrCode: SITE.qrCode,
  upiId: "",
  email: SITE.email,
  phone: SITE.phone,
  instagram: SITE.social.instagram,
  facebook: SITE.social.facebook,
  youtube: SITE.social.youtube,
  address: SITE.address,
  gstNumber: SITE.gstNumber,
  shippingCharge: 50, // placeholder until the client confirms (Admin → Settings)
  deliveryEstimate: "2–5 days",
  exchangePolicy: content.policies.exchange,
  refundPolicy: content.policies.refund,
  codAvailable: false,
  categories: DEFAULT_CATEGORIES,
};

// ---------------------------------------------------------------------------
// Category normalisation (safe migration of older data)
// ---------------------------------------------------------------------------

function normalizeSubcategory(raw: unknown, parentSlug: string): Subcategory | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = typeof s.name === "string" ? s.name.trim() : "";
  const slug = typeof s.slug === "string" && s.slug ? s.slug : slugify(name);
  if (!name || !slug) return null;
  return { id: typeof s.id === "string" && s.id ? s.id : `${parentSlug}--${slug}`, name, slug };
}

/**
 * Accepts categories in any earlier stored shape and returns the current shape.
 * - Older documents stored `{ slug, name, image }` without ids/subcategories: ids default to the
 *   slug, and categories matching a default (e.g. "atta") get the default subcategories.
 * - Nothing is dropped except entries without a usable name.
 */
export function normalizeCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return DEFAULT_CATEGORIES;
  return raw.flatMap((item): Category[] => {
    if (!item || typeof item !== "object") return [];
    const c = item as Record<string, unknown>;
    const name = typeof c.name === "string" ? c.name.trim() : "";
    const slug = typeof c.slug === "string" && c.slug ? c.slug : slugify(name);
    if (!name || !slug) return [];
    const fallback = DEFAULT_CATEGORIES.find((d) => d.slug === slug);
    const subcategories = Array.isArray(c.subcategories)
      ? c.subcategories.map((s) => normalizeSubcategory(s, slug)).filter((s) => s !== null)
      : (fallback?.subcategories ?? []);
    return [
      {
        id: typeof c.id === "string" && c.id ? c.id : slug,
        name,
        slug,
        image: typeof c.image === "string" ? c.image : (fallback?.image ?? ""),
        subcategories,
      },
    ];
  });
}

/** Always returns a complete settings object (defaults fill anything not yet saved). */
export async function getSettings(): Promise<Settings> {
  const { settings } = await collections();
  const doc = await settings.findOne({ _id: SETTINGS_ID }, { projection: { _id: 0, updatedAt: 0 } });
  const merged = { ...DEFAULT_SETTINGS, ...(doc ?? {}) } as Settings;
  return {
    ...merged,
    shippingCharge: Number.isFinite(Number(merged.shippingCharge)) ? Number(merged.shippingCharge) : DEFAULT_SETTINGS.shippingCharge,
    // Checkout must always have a QR: an empty saved value (e.g. from before the default QR
    // existed, or the admin removing it) falls back to the shop's default QR.
    qrCode: merged.qrCode || DEFAULT_SETTINGS.qrCode,
    codAvailable: false,
    categories: doc?.categories ? normalizeCategories(doc.categories) : DEFAULT_CATEGORIES,
  };
}

// ---------------------------------------------------------------------------
// Store settings (admin form). Categories are managed separately in ./categories.ts.
// ---------------------------------------------------------------------------

/** Validates the given fields. Unknown fields (and `categories`) are ignored. */
export function parseSettingsInput(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== "object") throw new ValidationError("Invalid settings.");
  const input = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};

  if ("storeName" in input) out.storeName = trimmedString(input.storeName, "Store name", { min: 2, max: 80 });
  if ("logo" in input) out.logo = urlOrEmpty(input.logo, "Logo");
  if ("ownerImage" in input) out.ownerImage = urlOrEmpty(input.ownerImage, "Owner image");
  if ("qrCode" in input) out.qrCode = urlOrEmpty(input.qrCode, "QR code");
  if ("instagram" in input) out.instagram = urlOrEmpty(input.instagram, "Instagram link");
  if ("facebook" in input) out.facebook = urlOrEmpty(input.facebook, "Facebook link");
  if ("youtube" in input) out.youtube = youtubeLinkOrEmpty(input.youtube);
  if ("address" in input) out.address = trimmedString(input.address, "Address", { max: 300 });
  if ("gstNumber" in input) {
    const gst = trimmedString(input.gstNumber, "GST number", { max: 20 }).toUpperCase();
    if (gst && !/^[A-Z0-9]{10,20}$/.test(gst)) throw new ValidationError("GST number should contain only letters and digits.");
    out.gstNumber = gst;
  }
  if ("shippingCharge" in input) {
    const n = Number(input.shippingCharge);
    if (input.shippingCharge === "" || !Number.isFinite(n) || n < 0 || n > 10_000) {
      throw new ValidationError("Shipping charge must be a number between 0 and 10000.");
    }
    out.shippingCharge = Math.round(n);
  }
  if ("deliveryEstimate" in input) out.deliveryEstimate = trimmedString(input.deliveryEstimate, "Delivery estimate", { min: 1, max: 40 });
  if ("exchangePolicy" in input) out.exchangePolicy = trimmedString(input.exchangePolicy, "Exchange policy", { min: 1, max: 500 });
  if ("refundPolicy" in input) out.refundPolicy = trimmedString(input.refundPolicy, "Refund policy", { min: 1, max: 500 });
  if ("codAvailable" in input && input.codAvailable !== false) {
    throw new ValidationError("Cash on Delivery is not supported by this website.");
  }
  if ("upiId" in input) {
    const upi = trimmedString(input.upiId, "UPI ID", { max: 100 });
    if (upi && !/^[\w.-]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$/.test(upi)) {
      throw new ValidationError("UPI ID looks invalid (example: shopname@okaxis).");
    }
    out.upiId = upi;
  }
  if ("email" in input) {
    const email = trimmedString(input.email, "Email", { max: 254 }).toLowerCase();
    if (email && !EMAIL_PATTERN.test(email)) throw new ValidationError("Please enter a valid email address.");
    out.email = email;
  }
  if ("phone" in input) {
    const phone = trimmedString(input.phone, "Phone", { max: 20 });
    if (phone && !/^\+?[\d\s-]{10,16}$/.test(phone)) throw new ValidationError("Please enter a valid phone number.");
    out.phone = phone;
  }
  return out;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

/** "" or an https link to youtube.com / youtu.be (e.g. https://www.youtube.com/@yourchannel). */
function youtubeLinkOrEmpty(value: unknown): string {
  const url = trimmedString(value, "YouTube link", { max: 1000 });
  if (url === "") return "";
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    // handled below
  }
  if (!parsed || parsed.protocol !== "https:" || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new ValidationError("YouTube link must be an https://www.youtube.com/… or https://youtu.be/… link.");
  }
  return url;
}

export async function updateSettings(raw: unknown): Promise<Settings> {
  const changes = parseSettingsInput(raw);
  const { settings } = await collections();
  // Store the full object on first save so the document is self-describing.
  const current = await getSettings();
  const next = { ...current, ...changes };
  await settings.updateOne({ _id: SETTINGS_ID }, { $set: { ...next, updatedAt: new Date() } }, { upsert: true });
  return next;
}
