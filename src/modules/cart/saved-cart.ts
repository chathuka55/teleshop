import "server-only";
import { getUserCartItems, saveUserCartItems } from "@/db/repositories/cart.repository";
import { requireUser } from "@/lib/auth/guards";
import { mergeCarts } from "./merge";
import { priceItems } from "./service";
import type { CartItemInput, DeliveryMethod, PricedCartDTO } from "./types";

/**
 * Signed-in users' saved cart (P4-T01). Kept apart from service.ts so guest pricing has no
 * dependency on the session (and can be used without Auth.js, e.g. in integration tests).
 */

/** Merges the browser cart into the account cart and returns the merged list (P4-T01). */
export async function syncMyCart(local: readonly CartItemInput[]): Promise<CartItemInput[]> {
  const { id } = await requireUser();
  const merged = mergeCarts(await getUserCartItems(id), local);
  await saveUserCartItems(id, merged);
  return merged;
}

/** Replaces the account cart with the browser cart (after add / change / remove). */
export async function saveMyCart(items: readonly CartItemInput[]): Promise<void> {
  const { id } = await requireUser();
  await saveUserCartItems(id, items);
}

export async function priceMyCart(deliveryMethod: DeliveryMethod): Promise<PricedCartDTO> {
  const { id } = await requireUser();
  return priceItems(await getUserCartItems(id), deliveryMethod);
}
