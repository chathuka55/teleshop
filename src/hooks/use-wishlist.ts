"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "teleshop:wishlist";
const MAX = 200;
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]): void {
  cache = next.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode / storage full: keep the in-memory copy only.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: string[] = [];

/** Guest wishlist (local only). Replaced by the server wishlist for signed-in users in P4-T02. */
export function useWishlist(): { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void } {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]);
  }, []);
  return { ids, has, toggle };
}
