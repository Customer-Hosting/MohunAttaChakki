/*
 * Customer-facing copy (English). Kept in one place so a Hindi or Bengali version can be added
 * later as a sibling file (e.g. content/hi.ts) with the same shape — no language switcher yet.
 *
 * Policies are the shop's terms. Do NOT add refunds, COD or free shipping here without the
 * client's confirmation. The exchange/refund text is only the default: the admin can edit it in
 * Admin → Settings.
 */

export const content = {
  hero: {
    label: "Featured products",
    slides: [
      {
        image: "/images/slider1.jpg",
        alt: "Mohan Atta Chakki — Pure, Fresh, Healthy chakki atta",
        href: "/shop?category=atta",
      },
      {
        image: "/images/slider2.jpg",
        alt: "Mohan Atta Chakki — Fresh Atta, Besan & Sattu for a healthy life",
        href: "/shop",
      },
    ],
  },

  /** Promo banners under Featured Products. */
  promos: [
    {
      key: "atta",
      image: "/images/promo-atta.jpg",
      eyebrow: "Whole wheat ground in a clean, hygienic chakki, so the bran stays in and every roti comes out soft.",
      title: "Chakki Fresh Atta",
      cta: "Shop Atta",
      href: "/shop?category=atta",
      alt: "Sack and bowl of fresh chakki atta with wheat ears",
    },
    {
      key: "besan",
      image: "/images/promo-besan-sattu.jpg",
      eyebrow: "Besan from 100% chana dal and sattu from roasted chana. Rich in protein, with no added preservatives.",
      title: "Pure Besan & Sattu",
      cta: "Shop Now",
      href: "/shop?category=besan",
      alt: "Bowls of atta, besan and sattu in front of a stone chakki",
    },
  ],

  audience: "Fresh chakki atta, besan, sattu and all types of pulses for every kitchen.",

  values: [
    { title: "Pure", text: "100% pure grains and pulses, with no artificial colour and no added preservatives." },
    { title: "Fresh", text: "Ground fresh in our own chakki and packed hygienically." },
    { title: "Healthy", text: "Whole wheat atta with the bran intact, and protein-rich besan and sattu." },
  ],

  policies: {
    delivery: "Fresh packs delivered to your doorstep.",
    exchange:
      "Torn, damaged or tampered packs are replaced if you report them within 48 hours of delivery with a photo. Opened packs cannot be exchanged.",
    refund: "No refunds are available.",
    cod: "COD is not available.",
    payment: "Payment by UPI / QR only. Your payment is verified manually by the shop.",
  },

  /** Short service strip (home page). `{shipping}` and `{delivery}` are filled from store settings. */
  services: [
    { key: "india", title: "Home Delivery", text: "Fresh packs delivered to your doorstep." },
    { key: "shipping", title: "{shipping} Shipping", text: "Flat shipping charge per order." },
    { key: "delivery", title: "{delivery} Delivery", text: "Estimated delivery time." },
    { key: "exchange", title: "Damaged Pack? Replaced", text: "Report it within 48 hours of delivery." },
    { key: "refund", title: "No Refund", text: "Replacement only. Refunds are not available." },
    { key: "cod", title: "No COD", text: "Pay securely by UPI / QR." },
  ],
} as const;

/**
 * FAQ — answered with the shop's CURRENT terms.
 * {shipping} and {delivery} are filled from store settings.
 */
export const faq = [
  {
    q: "What products do you offer?",
    a: "We grind and pack Chakki Fresh Atta, Besan and Sattu ourselves, and we also sell Maida, Sooji, Roasted Chana and all types of pulses (dal).",
  },
  {
    q: "Is your atta really chakki fresh?",
    a: "Yes. Our atta is made from whole wheat ground in a clean, hygienic chakki, so the bran stays in. It is packed hygienically and is best used within 3 months of packing.",
  },
  {
    q: "Do your products contain preservatives?",
    a: "No. Our besan and sattu are made from pure chana with no artificial colour and no added preservatives. Keep every pack in a cool, dry place away from direct sunlight.",
  },
  {
    q: "How can I place an order?",
    a: "Choose your product and quantity, and add it to your cart. At checkout, log in (or create an account), enter your delivery details, pay using the shop's UPI QR code, and enter your UPI transaction ID to place the order.",
  },
  { q: "Do you provide home delivery?", a: "Yes. We deliver fresh packs to your doorstep." },
  { q: "How are shipping charges calculated?", a: "A flat shipping charge of {shipping} is added to every order." },
  { q: "How long does delivery take?", a: "Estimated delivery is {delivery}. Exact delivery dates cannot be guaranteed." },
  {
    q: "How do I pay?",
    a: "Payment is by UPI / QR only. Scan the QR code shown at checkout with any UPI app, pay the order total, and enter the transaction ID. The shop verifies every payment manually before confirming your order.",
  },
  { q: "Is Cash on Delivery (COD) available?", a: "No. COD is not available." },
  {
    q: "What if my pack arrives torn or damaged?",
    a: "Please do not use a torn or tampered pack. Send us a photo within 48 hours of delivery and we will replace it. Opened packs cannot be exchanged.",
  },
  { q: "Do you give refunds?", a: "No refunds are available. Torn, damaged or tampered packs are replaced as described above." },
  {
    q: "How will I know my order is confirmed?",
    a: "After placing your order you receive an order number. The shop checks your UPI payment and then confirms the order. For any update, contact us with your order number.",
  },
  {
    q: "How can I contact Mohan Atta Chakki?",
    a: "You can call or WhatsApp us, send an email, or use the form on our Contact page.",
  },
] as const;

export type Content = typeof content;
