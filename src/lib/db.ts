import "server-only";
import { MongoClient, type CreateIndexesOptions, type Db } from "mongodb";
import { requireEnv } from "./env";
import type { MediaDoc, OrderDoc, ProductDoc, SettingsDoc, UserDoc } from "./types";

/*
 * One MongoClient per server instance.
 * - The client promise is stored on globalThis so it survives dev hot reloads and is reused by
 *   every request handled by a warm serverless instance (Vercel), instead of opening a new
 *   connection pool per request.
 * - The promise is created synchronously, so concurrent first requests share one connect().
 * - A failed connect is not cached, so the next request retries.
 */
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoIndexesPromise?: Promise<void>;
};

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(requireEnv("MONGODB_URI"), {
      appName: "mohan-attachakki",
      maxPoolSize: 10, // small pool: many serverless instances may connect at once
      maxIdleTimeMS: 60_000, // release idle sockets from frozen/idle instances
    });
    globalForMongo._mongoClientPromise = client.connect().catch((error) => {
      globalForMongo._mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const name = (process.env.MONGODB_DB || "mohan-attachakki").trim();
  if (/[\s/\\."$]/.test(name)) {
    throw new Error(`MONGODB_DB "${name}" is not a valid database name (no spaces, dots, slashes or quotes).`);
  }
  const client = await getClient();
  return client.db(name);
}

/**
 * Creates the indexes the app relies on. `createIndex` is a no-op when an index already exists.
 * Never throws: an index that can't be created (e.g. it already exists under another name/options,
 * existing data violates it, or the DB user lacks createIndex) is logged and skipped, so it can't
 * take down every request that reads or writes the database.
 */
async function ensureIndexes(db: Db): Promise<void> {
  const specs: [collection: string, keys: Record<string, 1 | -1>, options: CreateIndexesOptions & { name: string }][] = [
    // products
    ["products", { slug: 1 }, { unique: true, name: "slug_unique" }],
    ["products", { active: 1, category: 1, createdAt: -1 }, { name: "active_category_newest" }],
    ["products", { active: 1, featured: 1, createdAt: -1 }, { name: "active_featured_newest" }],
    ["products", { category: 1 }, { name: "category" }],
    ["products", { active: 1, category: 1, subcategory: 1, createdAt: -1 }, { name: "active_category_sub_newest" }],
    // orders
    ["orders", { orderNumber: 1 }, { unique: true, name: "orderNumber_unique" }],
    ["orders", { userId: 1, createdAt: -1 }, { name: "user_newest" }],
    ["orders", { createdAt: -1 }, { name: "newest" }],
    [
      "orders",
      { transactionId: 1 },
      { unique: true, name: "transactionId_unique", partialFilterExpression: { transactionId: { $type: "string", $gt: "" } } },
    ],
    // users
    ["users", { firebaseUid: 1 }, { unique: true, name: "firebaseUid_unique" }],
    // media (orphan cleanup scans oldest first)
    ["media", { createdAt: 1 }, { name: "createdAt" }],
  ];

  const results = await Promise.allSettled(specs.map(([name, keys, options]) => db.collection(name).createIndex(keys, options)));
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const [name, , options] = specs[i];
      console.error(`MongoDB index ${name}.${options.name} could not be created`, result.reason);
    }
  });
}

/** Typed access to the collections. Indexes are ensured once per server instance. */
export async function collections() {
  const db = await getDb();
  globalForMongo._mongoIndexesPromise ??= ensureIndexes(db).catch((error) => {
    console.error("MongoDB index setup failed", error);
  });
  await globalForMongo._mongoIndexesPromise;
  return {
    products: db.collection<ProductDoc>("products"),
    orders: db.collection<OrderDoc>("orders"),
    users: db.collection<UserDoc>("users"),
    settings: db.collection<SettingsDoc>("settings"),
    media: db.collection<MediaDoc>("media"),
  };
}
