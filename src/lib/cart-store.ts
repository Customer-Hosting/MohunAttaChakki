"use client";

import { useSyncExternalStore } from "react";

/*
 * Browser cart (localStorage) — guests can add items without an account.
 * Only ids, size and quantity are stored. Prices and stock are always re-read from the
 * server at checkout, so editing localStorage can't change what a customer pays.
 */

export interface CartItem {
  productId: string;
  slug: string;
  size: string | null;
  quantity: number;
}

const KEY = "mohan-cart-v1";
export const MAX_QTY_PER_LINE = 10;
export const MAX_CART_LINES = 50;
const EMPTY: CartItem[] = [];

let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function sanitize(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (i): i is CartItem =>
        i &&
        typeof i.productId === "string" &&
        typeof i.slug === "string" &&
        (i.size === null || typeof i.size === "string") &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    )
    .map((i) => ({ productId: i.productId, slug: i.slug, size: i.size, quantity: Math.min(i.quantity, MAX_QTY_PER_LINE) }))
    .slice(0, MAX_CART_LINES);
}

function read(): CartItem[] {
  if (cache) return cache;
  try {
    cache = sanitize(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode) — the cart still works for this page view.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null; // another tab changed the cart
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const sameLine = (a: Pick<CartItem, "productId" | "size">, b: Pick<CartItem, "productId" | "size">) =>
  a.productId === b.productId && a.size === b.size;

/**
 * Adds to the cart (merging with an existing line for the same product + size).
 * `maxQuantity` is the stock the customer was shown. Returns the line's new quantity.
 */
export function addToCart(item: CartItem, maxQuantity: number): number {
  const limit = Math.max(0, Math.min(maxQuantity, MAX_QTY_PER_LINE));
  const items = [...read()];
  const index = items.findIndex((i) => sameLine(i, item));
  const current = index >= 0 ? items[index].quantity : 0;
  const quantity = Math.min(current + item.quantity, limit);
  if (quantity <= 0) return current;
  if (index >= 0) items[index] = { ...items[index], quantity };
  else if (items.length < MAX_CART_LINES) items.push({ ...item, quantity });
  else return current;
  write(items);
  return quantity;
}

export function setCartQuantity(line: Pick<CartItem, "productId" | "size">, quantity: number) {
  const q = Math.max(0, Math.min(Math.floor(quantity), MAX_QTY_PER_LINE));
  write(q === 0 ? read().filter((i) => !sameLine(i, line)) : read().map((i) => (sameLine(i, line) ? { ...i, quantity: q } : i)));
}

export function removeFromCart(line: Pick<CartItem, "productId" | "size">) {
  write(read().filter((i) => !sameLine(i, line)));
}

export function clearCart() {
  write([]);
}

/** Current cart items; re-renders when the cart changes (also across tabs). Empty during SSR. */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((sum, item) => sum + item.quantity, 0);
}
