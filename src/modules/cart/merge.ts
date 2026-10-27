import { MAX_CART_LINES, MAX_QTY } from "./schema";
import type { CartItemInput } from "./types";

/**
 * Merges the browser cart into the saved cart (sign-in on a new device, guest → account):
 * one line per SKU with the larger quantity, capped at MAX_QTY, at most MAX_CART_LINES lines,
 * saved lines first. Pure — unit tested.
 */
export function mergeCarts(
  saved: readonly CartItemInput[],
  local: readonly CartItemInput[],
): CartItemInput[] {
  const merged = new Map<string, number>();
  for (const { sku, qty } of [...saved, ...local]) {
    merged.set(sku, Math.min(MAX_QTY, Math.max(merged.get(sku) ?? 0, qty)));
  }
  return [...merged].slice(0, MAX_CART_LINES).map(([sku, qty]) => ({ sku, qty }));
}
