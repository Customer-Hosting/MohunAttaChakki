import "server-only";
import { randomInt } from "node:crypto";
import { MongoServerError, type Filter, type WithId } from "mongodb";
import { collections } from "../db";
import {
  ORDER_STATUSES,
  PAYMENT_METHOD,
  PAYMENT_STATUSES,
  type Order,
  type OrderDoc,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
} from "../types";
import { cleanName, normalizePhone } from "../validation";
import { clampLimit, EMAIL_PATTERN, toObjectId, trimmedString, ValidationError } from "./common";
import { releaseStock, reserveStock } from "./products";

export function toOrder(doc: WithId<OrderDoc>): Order {
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    shipping: rest.shipping ?? 0, // orders created before shipping was recorded
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface CustomerDetails {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

/** Validates the delivery form (shared by checkout). */
export function parseCustomerDetails(raw: unknown): CustomerDetails {
  if (!raw || typeof raw !== "object") throw new ValidationError("Please fill in your delivery details.");
  const input = raw as Record<string, unknown>;

  const customerName = cleanName(input.customerName);
  if (!customerName) throw new ValidationError("Please enter your full name.");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ValidationError("Please enter a valid 10-digit mobile number.");
  // Email is optional (customers may sign up with just a mobile number); when given it must be valid.
  const email = trimmedString(input.email ?? "", "Email", { max: 254 }).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) throw new ValidationError("Please enter a valid email address.");
  const pincode = trimmedString(input.pincode, "Pincode", { min: 1, max: 6 });
  if (!/^[1-9]\d{5}$/.test(pincode)) throw new ValidationError("Please enter a valid 6-digit pincode.");

  return {
    customerName,
    phone,
    email,
    address: trimmedString(input.address, "Address", { min: 5, max: 300 }),
    city: trimmedString(input.city, "City", { min: 2, max: 60 }),
    state: trimmedString(input.state, "State", { min: 2, max: 60 }),
    pincode,
  };
}

/** UPI reference / UTR numbers: letters and digits, 6–40 characters. */
export function parseTransactionId(raw: unknown): string {
  const id = trimmedString(raw, "Transaction ID", { min: 1, max: 40 }).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9]{6,40}$/.test(id)) {
    throw new ValidationError("Please enter the transaction / UTR number exactly as shown in your UPI app.");
  }
  return id;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const ORDER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** e.g. MA-20261008-7KQ2 (date in India time). */
export function generateOrderNumber(date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
  let code = "";
  for (let i = 0; i < 4; i++) code += ORDER_CODE_CHARS[randomInt(ORDER_CODE_CHARS.length)];
  return `MA-${ist}-${code}`;
}

export interface NewOrder extends CustomerDetails {
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  transactionId: string;
}

/**
 * Inserts an order with a unique order number. Items and totals must already be priced
 * server-side from the products collection — never from client-supplied prices.
 * Stock is reserved first and released again if the insert fails.
 */
export async function createOrder(
  input: NewOrder,
): Promise<{ ok: true; order: Order } | { ok: false; reason: "out-of-stock"; productId: string }> {
  if (input.items.length === 0) throw new ValidationError("Your cart is empty.");
  const stockLines = input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
  const reserved = await reserveStock(stockLines);
  if (!reserved.ok) return { ok: false, reason: "out-of-stock", productId: reserved.productId };

  const { orders } = await collections();
  const now = new Date();
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const doc: Omit<OrderDoc, "_id"> = {
        orderNumber: generateOrderNumber(now),
        userId: input.userId,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        items: input.items,
        subtotal: input.subtotal,
        shipping: input.shipping,
        total: input.total,
        paymentMethod: PAYMENT_METHOD,
        transactionId: input.transactionId,
        paymentStatus: input.transactionId ? "Submitted" : "Pending",
        orderStatus: "Pending",
        createdAt: now,
        updatedAt: now,
      };
      try {
        const { insertedId } = await orders.insertOne(doc as OrderDoc);
        return { ok: true, order: toOrder({ ...doc, _id: insertedId }) };
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
        // The same UPI transaction ID can't pay for two orders (also stops double-submits).
        if (error.keyPattern?.transactionId) {
          throw new ValidationError("This transaction ID has already been used for another order.");
        }
        // Otherwise an order-number collision (very unlikely) — generate another.
      }
    }
    throw new Error("Could not generate a unique order number.");
  } catch (error) {
    await releaseStock(stockLines);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getOrderById(id: string): Promise<Order | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { orders } = await collections();
  const doc = await orders.findOne({ _id });
  return doc ? toOrder(doc) : null;
}

/** A customer's own orders, newest first. */
export async function listOrdersByUser(userId: string, limit?: number): Promise<Order[]> {
  const { orders } = await collections();
  const docs = await orders.find({ userId }).sort({ createdAt: -1 }).limit(clampLimit(limit, 50)).toArray();
  return docs.map(toOrder);
}

export interface OrderQuery {
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  limit?: number;
  skip?: number;
}

function orderFilter(query: OrderQuery): Filter<OrderDoc> {
  const filter: Filter<OrderDoc> = {};
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  return filter;
}

/** Admin list, newest first. */
export async function listOrders(query: OrderQuery = {}): Promise<Order[]> {
  const { orders } = await collections();
  const docs = await orders
    .find(orderFilter(query))
    .sort({ createdAt: -1 })
    .skip(Math.max(0, Math.floor(query.skip ?? 0)))
    .limit(clampLimit(query.limit, 50))
    .toArray();
  return docs.map(toOrder);
}

export async function countOrders(query: Omit<OrderQuery, "limit" | "skip"> = {}): Promise<number> {
  const { orders } = await collections();
  return orders.countDocuments(orderFilter(query));
}

// ---------------------------------------------------------------------------
// Update (admin)
// ---------------------------------------------------------------------------

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus);
}
export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

/**
 * Updates payment and/or order status.
 * Cancelling returns the items to stock; un-cancelling takes them again (fails if no longer available).
 */
export async function updateOrderStatus(
  id: string,
  changes: { paymentStatus?: unknown; orderStatus?: unknown },
): Promise<Order | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const set: Partial<OrderDoc> = {};
  if (changes.paymentStatus !== undefined) {
    if (!isPaymentStatus(changes.paymentStatus)) throw new ValidationError("Invalid payment status.");
    set.paymentStatus = changes.paymentStatus;
  }
  if (changes.orderStatus !== undefined) {
    if (!isOrderStatus(changes.orderStatus)) throw new ValidationError("Invalid order status.");
    set.orderStatus = changes.orderStatus;
  }
  if (Object.keys(set).length === 0) throw new ValidationError("Nothing to update.");

  const { orders } = await collections();
  const before = await orders.findOne({ _id });
  if (!before) return null;

  const lines = before.items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size }));
  const cancelling = set.orderStatus === "Cancelled" && before.orderStatus !== "Cancelled";
  const reopening = set.orderStatus !== undefined && set.orderStatus !== "Cancelled" && before.orderStatus === "Cancelled";

  if (reopening) {
    const reserved = await reserveStock(lines);
    if (!reserved.ok) throw new ValidationError("Cannot reopen this order: some items are out of stock.");
  }

  // Guard on the previous status so two admins changing the same order can't double-adjust stock.
  const updated = await orders.findOneAndUpdate(
    { _id, orderStatus: before.orderStatus },
    { $set: { ...set, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) {
    if (reopening) await releaseStock(lines);
    throw new ValidationError("This order was changed by someone else. Please refresh and try again.");
  }
  if (cancelling) await releaseStock(lines);
  return toOrder(updated);
}

/** Sum of order totals whose payment is verified (cancelled orders excluded). */
export async function verifiedRevenue(): Promise<number> {
  const { orders } = await collections();
  const [row] = await orders
    .aggregate<{ total: number }>([
      { $match: { paymentStatus: "Verified", orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])
    .toArray();
  return row?.total ?? 0;
}

/** Orders that are paid/confirmed but not yet shipped. */
export async function countToShip(): Promise<number> {
  const { orders } = await collections();
  return orders.countDocuments({ orderStatus: { $in: ["Confirmed", "Processing"] } });
}
