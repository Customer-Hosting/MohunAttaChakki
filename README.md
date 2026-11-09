# Mohan Atta Chakki

Online store for **Mohan Atta Chakki**, Burdwan: chakki fresh atta, besan and sattu (ground and
packed in-house under the *Mac Computer Brand*), plus maida, sooji, roasted chana and all types of
pulses. Customers browse without an account and sign in to use a wishlist or to buy.
Payment is **manual UPI / QR**: the customer pays, enters the transaction ID, and the admin verifies it.
There is **no COD and no refunds**; torn/damaged/tampered packs are replaced if reported within 48 hours.

Built from the *Sonam's Clothing* codebase: same stack, same features, same layout, with the
colours, content, categories and images changed for a grocery business.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) · MongoDB · Firebase Authentication
(email/password, optional Analytics) · uploaded images stored in MongoDB · hosted on Vercel.

---

## Business information (client-supplied)

| | |
| --- | --- |
| Address | Sasan Para, Talit, Burdwan, West Bengal (packs print: Borehat, Burdwan – 713102) |
| Phone / WhatsApp | +91 97348 61080 |
| Email | khandelwal.nilay@zohomail.com (packs also print mohanatta.burdwan@gmail.com) |
| FSSAI Lic. No. | 12821022000229 (shown on the site) |
| Products | Chakki Fresh Atta, Matar Besan, Chana Sattu, Sooji, Maida, Roasted Chana, pulses |
| Delivery (placeholder) | ₹50 shipping per order, estimated 2–5 days |
| Replacement / refunds / COD | Damaged-pack replacement within 48 h · no refunds · no COD |

These are the defaults in `src/lib/site.ts` and `src/content/en.ts`. The admin can edit contact
details, the shipping charge and the policies under **Admin → Settings**.

## Colours

Set once in `src/app/globals.css` (Tailwind theme tokens, same roles as the original site):

| Token | Colour | Used for |
| --- | --- | --- |
| `brand` | `#f5b82e` golden wheat | top strip, highlight fills, icons on dark backgrounds |
| `accent` | `#2e7d32` leaf green | eyebrows, links, active nav, badges, button hover |
| `ink` | `#14361f` deep forest green | text, dark buttons, footer, admin sidebar |
| `neutral-50` | `#fbf7ec` wheat cream | alternating light sections |

---

## Status

Done: everything from the original site (Home, Shop with category/subcategory filters, Product,
Wishlist, Cart & UPI checkout, About, FAQ, Contact, accounts, full admin panel).

- **Home:** hero slider (the two Mohan Atta Chakki banners), 4 main categories, featured products,
  atta and besan/sattu promo banners, a "From our chakki" panel (replaces the shop video) and the
  service strip.
- **Categories:** Atta & Flour (Chakki Fresh Atta, Maida, Sooji) · Besan · Sattu · Pulses & Dal
  (Chana, Masoor, Moong, Arhar/Toor, Rajma, Other) · Roasted Snacks. Editable in Admin → Categories.
- **Pack size:** the product "sizes" field holds the pack weight (e.g. `1 kg`). One price is shared
  by all sizes of a product, so each weight with its own price is a **separate product**.
- **Catalogue:** `npm run seed` adds 7 products from the packaging photos. With printed MRPs:
  Chakki Fresh Atta 1 kg ₹60, Matar Besan ₹20, Chana Sattu ₹35, Sooji 200 g ₹18. Hidden until
  priced (placeholder ₹1): Maida 1 kg, Roasted Chana, Pulses 250 g. Stock is a placeholder of 10.

Still needed from the client:
- **Payment QR image and UPI ID** (checkout shows "contact us" until they are added in Settings)
- Net weights for Besan (₹20) and Sattu (₹35); prices for Maida, Roasted Chana and the pulses
- Real stock numbers, shipping charge and delivery estimate, and delivery area
- Instagram, Facebook and YouTube links and GSTIN (all optional, hidden while empty; set them in Admin → Settings)
- Confirm the WhatsApp number and the replacement policy wording

---

## Getting started

Requirements: Node.js 22 (pinned in `package.json` → `engines`, which Vercel also follows) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Settings are read from **`.env`** (git-ignored). `.env.example` explains each value.

| Variable | Secret? | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | **yes** | MongoDB Atlas connection string |
| `MONGODB_DB` | no | Database name, e.g. `mohan-attachakki` (no spaces or dots) |
| `NEXT_PUBLIC_FIREBASE_*` | no | Firebase web app config (public). `..._MEASUREMENT_ID` is optional and turns on Analytics |
| `FIREBASE_PROJECT_ID` | no | Used to verify login tokens on the server (falls back to `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) |
| `ADMIN_EMAILS` | **yes** | Comma-separated admin emails |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL (canonical links, Open Graph, sitemap) |

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | Generate route types and run the TypeScript check |
| `npm run lint` | ESLint |
| `npm run seed` | Add the starting products to the database (never overwrites existing ones) |
| `npm run build` / `npm start` | Production build / run |

---

## Pages

| URL | Who | Notes |
| --- | --- | --- |
| `/` | everyone | Hero slider, the 4 main categories, featured products, promo banners, shop video, About section, delivery/exchange strip |
| `/shop` | everyone | `?category=atta&subcategory=chakki-atta` (names such as `?category=Besan` also work), `q`, `sort`, `page` |
| `/shop/[slug]` | everyone | Gallery, category/subcategory, sizes, stock, quantity, Add to Cart, Buy Now, Wishlist |
| `/about` | everyone | Story, owner photo, values, policies, contact (address, phone/WhatsApp, email, socials) |
| `/faq` | everyone | Reference-site questions answered with the current policies (FAQPage structured data) |
| `/contact` | everyone | Phone, WhatsApp, email, address, map, and a message form that opens WhatsApp or email (nothing stored) |
| `/wishlist` | logged in | Guests see "Please login to view your wishlist." |
| `/cart` | everyone | Guests can fill the cart. Checkout (delivery details → UPI QR → transaction ID) requires login |
| `/login` | everyone | Login, signup and forgot password |
| `/admin/*` | admins | Dashboard, products, categories, orders, users, settings |
| `/robots.txt`, `/sitemap.xml` | — | Generated |

Customer pages sit in `src/app/(store)`, which adds the store header and footer. The admin area has
its own layout.

## API routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | — | Deployment check: database reachable and readable (no details exposed) |
| `POST /api/auth/sync` | user | Create or update the user record after login |
| `GET`/`POST`/`DELETE /api/wishlist` | user | Wishlist (`?include=products` returns details) |
| `POST /api/cart/quote` | — | Re-price cart lines from the database (prices, stock, flat shipping) |
| `GET`/`POST /api/orders` | user | My orders / place an order (UPI transaction ID required) |
| `GET /api/admin/stats` | admin | Dashboard numbers |
| `GET`/`POST /api/admin/products`, `GET`/`PATCH`/`DELETE /api/admin/products/[id]` | admin | Products |
| `POST /api/admin/upload` | admin | Stores an image in MongoDB → `{ url: "/media/<id>.<ext>" }` (JPG/PNG/WebP; originals up to 16 MB are resized in the browser, server accepts ≤ 4 MB) |
| `GET /media/<id>.<ext>` | public | Serves an uploaded image (cached for a year by browsers and Vercel's CDN) |
| `GET`/`POST /api/admin/categories` | admin | Categories and subcategories (action-based POST) |
| `GET /api/admin/orders`, `GET`/`PATCH /api/admin/orders/[id]` | admin | Orders and status updates |
| `GET /api/admin/users` | admin | Users |
| `GET`/`PUT /api/admin/settings` | admin | Store settings |
| `GET /api/admin/me` | admin | Admin check |

Protected routes expect `Authorization: Bearer <Firebase ID token>`. Admin routes check both
`role: "admin"` in MongoDB and `ADMIN_EMAILS`.

---

## Data (MongoDB, five collections)

| Collection | Notes |
| --- | --- |
| `products` | `category` (slug) plus an optional `subcategory` (slug). Existing products without a subcategory keep working. |
| `orders` | Items are priced on the server. Stores `subtotal`, `shipping`, `total = subtotal + shipping`, `transactionId` (unique, so one payment can't be reused), payment status and order status. |
| `users` | firebaseUid, name, email, phone, role, optional `wishlist` (product IDs). No passwords are stored. |
| `media` | Uploaded images (bytes, type, size, uploader, date), served from `/media/<id>.<ext>`. Never loaded by ordinary product queries. See [Uploaded images](#uploaded-images). |
| `settings` | One document (`_id: "store"`): store details, QR/UPI, GST, shipping charge, delivery estimate, policies, and **categories with subcategories** (`{ id, name, slug, image, subcategories: [{ id, name, slug }] }`). |

**Migration:** none needed. Older category data (`{ slug, name, image }` without IDs or subcategories)
is normalised when read. Ids default to the slug, and the default categories gain their default
subcategories. Nothing is deleted. New indexes are created automatically on first use.

**Category rules:**
- Names must be unique and not empty, and slugs are generated safely.
- Renaming a category or subcategory moves its products to the new slug.
- A category or subcategory that products still use **cannot be deleted** until those products are
  reassigned. The admin is shown how many products use it.

**Caching:** storefront reads (`src/lib/catalog.ts`) use `"use cache: remote"` with the tags `products`
and `settings`, so cached results are shared across Vercel's serverless instances instead of living in
one instance's memory. Admin changes and orders expire the cache immediately
(`revalidateTag(tag, { expire: 0 })`).

---

## Assets (`public/images`, client-supplied)

| File | Used for |
| --- | --- |
| `slider1.jpg`, `slider2.jpg` | Home hero slider (Mohan Atta Chakki banners) |
| `promo-atta.jpg`, `promo-besan-sattu.jpg` | Home promo banners (cropped from the banners) |
| `grocery-basket.png` | "From our chakki" panel (transparent cut-out) |
| `about-chakki.jpg` | About page photo (Admin → Settings → owner image) |
| `page-header.jpg` | About / FAQ / Contact header background |
| `products/*-front.jpeg`, `*-back.jpeg` | Product and category photos (pack front and back) |

The logo is `public/brand/logo.png` (Mac Computer Brand); `logo-square.png`, `src/app/icon.png` and
`apple-icon.png` are square versions for link previews and the browser tab.
Customer-facing text lives in `src/content/en.ts`, so a Hindi or Bengali version can be added later.

## Uploaded images

Admin uploads are stored in MongoDB, not on disk (Vercel's filesystem is read-only) and not in a
paid service:

- The browser resizes photos to at most 2000 px (WebP, transparency kept) before uploading, so a
  16 MB original usually becomes 0.2–1.5 MB and every request stays under Vercel's 4.5 MB limit.
- The server checks admin access, the real file signature (JPG/PNG/WebP) and completeness, and
  stores the bytes in the `media` collection. Products, settings and orders keep only the short URL.
- `/media/<id>.<ext>` is public and immutable (a replaced image gets a new id), so browsers, Vercel's
  CDN and `next/image` cache it; MongoDB is read only on the first request.
- Removing an image from a product, or deleting the product, deletes the stored file only when no
  product, setting, category image or order still uses it. Uploads never saved on anything are
  removed after 24 hours.
- Space: the Atlas free tier (M0) has 512 MB. At ~0.3–1 MB per image that is roughly 500–1,500
  images alongside the shop data. Check usage in Atlas → Cluster → Metrics.

## Deploying to Vercel

1. Push to GitHub and import the repository in Vercel.
2. Add the `.env` variables under **Project Settings → Environment Variables**. Set
   `NEXT_PUBLIC_SITE_URL` to the live domain.
3. Functions run in Mumbai (`bom1`, set in `vercel.json`) next to the MongoDB Atlas cluster
   (AWS ap-south-1). If the cluster ever moves, change `regions` to match.
4. **MongoDB Atlas → Network Access**: allow Vercel (usually `0.0.0.0/0`, protected by the DB user
   password).
5. **Firebase → Authentication → Settings → Authorized domains**: add the Vercel domain.
6. After deploying, sign in at `/admin` and add the UPI ID in Settings, then add products. Change the
   admin password after handover.

Never set `FIREBASE_AUTH_EMULATOR_HOST` in production; it exists only for local testing (the server
rejects every login if it is set on Vercel).

## Security

- Secrets are read only in server code. Only the public Firebase web config reaches the browser.
- Every protected API verifies the Firebase ID token on the server (`src/lib/firebase/verify-token.ts`:
  Google's public signing keys, issuer, audience and expiry, using Node's built-in `crypto`; no
  service-account key is needed). Hiding admin pages in the browser is only a convenience.
- Image uploads are admin-only and checked by their real file signature, not the browser's file type.
- Prices, stock, shipping and roles are never trusted from the browser.
