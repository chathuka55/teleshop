"use client";

import { useCallback, useSyncExternalStore } from "react";
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

function write(next: CartItemInput[]): void {
  cache = sanitize(next);
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
 * The cart page re-prices it on the server. P4-T01 moves it to a signed cookie + `carts`.
 */
export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((sku: string, qty = 1) => {
    const cur = read();
    const found = cur.find((i) => i.sku === sku);
    write(found ? cur.map((i) => (i.sku === sku ? { sku, qty: i.qty + qty } : i)) : [...cur, { sku, qty }]);
  }, []);
  const setQty = useCallback((sku: string, qty: number) => {
    write(read().map((i) => (i.sku === sku ? { sku, qty } : i)));
  }, []);
  const remove = useCallback((sku: string) => write(read().filter((i) => i.sku !== sku)), []);
  const clear = useCallback(() => write([]), []);
  const count = items.reduce((n, i) => n + i.qty, 0);
  return { items, count, add, setQty, remove, clear };
}
