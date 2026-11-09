// Adds the starting catalogue (from the client's packaging photos) to an empty database.
//
//   npm run seed
//
// Safe to run more than once: a product is only inserted if no product with the same slug exists,
// so edits made in Admin → Products are never overwritten. Settings and categories are not touched
// (the site uses its built-in defaults until the admin saves changes).
//
// Prices are the MRPs printed on the packs. Products without a printed price are added HIDDEN
// (active: false) with a placeholder price of ₹1: set the real price in the admin, then show them.
// Stock is a placeholder of 10 for every product.

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("<db_password>")) {
  console.error("Set MONGODB_URI in .env first (with the real database username and password).");
  process.exit(1);
}
const dbName = (process.env.MONGODB_DB || "mohan-attachakki").trim();

const img = (name) => [`/images/products/${name}-front.jpeg`, `/images/products/${name}-back.jpeg`];

const PRODUCTS = [
  {
    name: "Chakki Fresh Atta 1 kg",
    slug: "chakki-fresh-atta-1kg",
    category: "atta",
    subcategory: "chakki-atta",
    price: 60,
    sizes: ["1 kg"],
    images: img("atta"),
    featured: true,
    active: true,
    description: [
      "100% pure and nutritious whole wheat atta, ground in a clean and hygienic chakki so the bran stays intact. Processed and packed hygienically for soft, tasty and delicious rotis.",
      "",
      "Ingredient: whole wheat.",
      "Nutrition (approx. per 100 g): energy 351 kcal, carbohydrate 72 g (sugar 0 g), protein 12.18 g, fat 1.7 g, dietary fibre 11.2 g.",
      "",
      "Best before 3 months from packing. Keep in a cool, dry place away from sunlight. Do not purchase a torn or tampered pack.",
    ].join("\n"),
  },
  {
    name: "Matar Besan",
    slug: "matar-besan",
    category: "besan",
    subcategory: "matar-besan",
    price: 20,
    sizes: [],
    images: img("besan"),
    featured: true,
    active: true,
    description: [
      "Made from 100% chana dal. Pure, hygienic and 100% food grade. Rich in protein and iron, it boosts immunity and relieves flatulence. Ideal for pakoras, dhokla, sev and laddoos.",
      "",
      "Ingredient: chana dal. No preservative used.",
      "Nutrition (per 100 g, dry basis): protein min. 11.8%, fat max. 2.0%, minerals max. 1.7%, fibre max. 2.0%, carbohydrates max. 82%, energy 393.5 kcal.",
      "",
      "Best before 4 months from the date of packaging.",
    ].join("\n"),
  },
  {
    name: "Chana Sattu",
    slug: "chana-sattu",
    category: "sattu",
    subcategory: "chana-sattu",
    price: 35,
    sizes: [],
    images: img("sattu"),
    featured: true,
    active: true,
    description: [
      "Made from pure chana. Full of proteins and vitamins, pure and fresh. Sattu is like a nectar for the stomach.",
      "",
      "How to make a sattu drink: every morning on an empty stomach take a glass of cold water, add 4 teaspoons of sattu, mix in salt or sugar to taste and lemon juice if needed, and enjoy.",
      "",
      "Ingredient: gram (chana). No artificial colour, no added preservatives.",
      "Approximate composition per 100 g: energy 403.6 kcal, carbohydrate 64.3%, protein 22.9%, fat 5.7%, crude fibre 1.05%.",
      "",
      "Best before 4 months from the date of packaging. Keep in a cool, dry place away from direct sunlight.",
    ].join("\n"),
  },
  {
    name: "Sooji 200 g",
    slug: "sooji-200g",
    category: "atta",
    subcategory: "sooji",
    price: 18,
    sizes: ["200 g"],
    images: img("sooji"),
    featured: true,
    active: true,
    description: [
      "Nutritious and delicious sooji for halwa, upma, laddoos and sweets.",
      "",
      "On opening, transfer the contents to a clean airtight container and replace the lid tightly after each use. Store in a cool, dry and insect-free place (not refrigerated), away from direct sunlight and strong odours.",
      "",
      "Best before 3 months from packaging.",
    ].join("\n"),
  },
  {
    name: "Maida 1 kg",
    slug: "maida-1kg",
    category: "atta",
    subcategory: "maida",
    price: 1, // PLACEHOLDER: no price printed on the pack
    sizes: ["1 kg"],
    images: img("maida"),
    featured: false,
    active: false,
    description: [
      "100% natural maida made from fresh wheat, scientifically processed and packed with the help of the latest technology. A product of high nutritional value, full of vitamins. Perfect for puris, samosas and baking.",
      "",
      "Best before 4 months from the date of packaging.",
    ].join("\n"),
  },
  {
    name: "Roasted Chana",
    slug: "roasted-chana",
    category: "snacks",
    subcategory: "roasted-chana",
    price: 1, // PLACEHOLDER: no price printed on the pack
    sizes: [],
    images: img("roasted-chana"),
    featured: false,
    active: false,
    description: [
      "Swadist chatpata roasted chana, guaranteed 100% fresh. Chana contains a lot of protein: half a cup delivers 10 to 12 grams. Packed with fibre, it helps bring down cholesterol and keeps you feeling fuller for longer, and its low glycaemic index helps steady blood sugar levels.",
      "",
      "Ingredient: roasted chana.",
      "Best before 6 months from the date of manufacture. Keep in a cool, dry place away from direct sunlight.",
    ].join("\n"),
  },
  {
    name: "Pulses 250 g",
    slug: "pulses-250g",
    category: "pulses",
    subcategory: "other",
    price: 1, // PLACEHOLDER: no price printed on the pack; also rename to the exact pulse
    sizes: ["250 g"],
    images: img("pulses"),
    featured: false,
    active: false,
    description: [
      "Nutritious and healthy pulses, repacked by Mohan Atta Chakki, Borhat, Burdwan.",
      "",
      "Best before 2 months from the date of packing.",
    ].join("\n"),
  },
];

const client = new MongoClient(uri, { appName: "mohan-attachakki-seed" });
try {
  await client.connect();
  const products = client.db(dbName).collection("products");
  let added = 0;
  for (const [i, p] of PRODUCTS.entries()) {
    // Spread creation times so "newest first" keeps this order.
    const createdAt = new Date(Date.now() - i * 1000);
    const doc = { ...p, salePrice: null, stock: 10, createdAt, updatedAt: createdAt };
    const result = await products.updateOne({ slug: p.slug }, { $setOnInsert: doc }, { upsert: true });
    if (result.upsertedCount) {
      added++;
      console.log(`+ ${p.name}${p.active ? "" : " (hidden: set the price first)"}`);
    } else {
      console.log(`= ${p.name} (already exists, left unchanged)`);
    }
  }
  console.log(`Done: ${added} product(s) added to "${dbName}".`);
} finally {
  await client.close();
}
