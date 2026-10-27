"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { saveCartAction, syncCartAction } from "@/modules/cart/actions";
import type { CartItemInput } from "@/modules/cart/types";

const KEY = "teleshop:cart";
const MAX_LINES = 50;
const MAX_QTY = 10;
const SKU = /^[A-Z0-9-]{2,64}$/;
const listeners = new Set<() => void>();
const EMPTY: CartItemInput[] = [];
let cache: CartItemInput[] | null = null;

function sanitize(value: unknown): CartItemInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (x): x is CartItemInput =>
        typeof x === "object" &&
        x !== null &&
        typeof x.sku === "string" &&
        SKU.test(x.sku) &&
        Number.isInteger(x.qty),
    )
    .map((x) => ({ sku: x.sku, qty: Math.min(Math.max(x.qty, 1), MAX_QTY) }))
    .slice(0, MAX_LINES);
}

function read(): CartItemInput[] {
  if (cache) return cache;
  try {
    cache = sanitize(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    cache = [];
  }
  return cache;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let synced = false;

/** Signed-in users: keep the account cart in step (debounced). Guests: the action is a no-op. */
function scheduleSave(items: CartItemInput[]): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveCartAction(items).catch(() => undefined), 600);
}

/** Once per page load: merge this browser's cart with the account cart (sign-in, other device). */
function syncOnce(): void {
  if (synced) return;
  synced = true;
  void syncCartAction(read())
    .then((merged) => {
      if (merged) write(merged, { save: false });
    })
    .catch(() => undefined);
}

/** Lets the checkout page force a fresh merge before reading the account cart. */
export async function syncCartNow(): Promise<void> {
  clearTimeout(saveTimer);
  const merged = await syncCartAction(read());
  if (merged) write(merged, { save: false });
}

function write(next: CartItemInput[], { save = true }: { save?: boolean } = {}): void {
  cache = sanitize(next);
  if (save) scheduleSave(cache);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable — keep in memory
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Guest cart kept in the browser — SKU + quantity only, never prices (RULES.md money rules).
 * The cart page re-prices it on the server. Signed-in users' carts are also saved in `carts`
 * (merged once per page load, saved after each change) so they follow the account (P4-T01).
 */
export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  useEffect(syncOnce, []);
  const add = useCallback((sku: string, qty = 1) => {
    const cur = read();
    const found = cur.find((i) => i.sku === sku);
    write(found ? cur.map((i) => (i.sku === sku ? { sku, qty: i.qty + qty } : i)) : [...cur, { sku, qty }]);
  }, []);
  const setQty = useCallback((sku: string, qty: number) => {
    write(read().map((i) => (i.sku === sku ? { sku, qty } : i)));
  }, []);
  const remove = useCallback((sku: string) => write(read().filter((i) => i.sku !== sku)), []);
  // After an order the server has already emptied the account cart.
  const clear = useCallback(() => write([], { save: false }), []);
  const count = items.reduce((n, i) => n + i.qty, 0);
  return { items, count, add, setQty, remove, clear };
}
