"use client";

import { useCallback, useSyncExternalStore } from "react";
import { toggleWishlistAction } from "@/modules/wishlist/actions";

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

/**
 * Wishlist hearts. The browser copy updates instantly; for signed-in users the change is also
 * saved to their account (`wishlists`), guests keep it locally until it is merged on
 * /account/wishlist. `replaceAll` lets that page align the browser copy with the server list.
 */
export function useWishlist(): {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  replaceAll: (ids: string[]) => void;
} {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    const current = read();
    const saved = !current.includes(id);
    write(saved ? [id, ...current] : current.filter((x) => x !== id));
    // Best effort: a network error leaves the local copy, which syncs on the next visit.
    void toggleWishlistAction(id, saved).catch(() => undefined);
  }, []);
  const replaceAll = useCallback((next: string[]) => write(next), []);
  return { ids, has, toggle, replaceAll };
}

/** Current browser copy, for one-off reads outside React (sync on the wishlist page). */
export function readLocalWishlist(): string[] {
  return read();
}
