"use server";

import { limitAction } from "@/lib/security/action-limit";
import { cartItemsSchema } from "./schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { priceMyCart, saveMyCart, syncMyCart } from "./saved-cart";
import { priceGuestCart } from "./service";
import type { CartItemInput, DeliveryMethod, PricedCartDTO } from "./types";

export type PriceCartResult =
  { ok: true; cart: PricedCartDTO } | { ok: false; code: "VALIDATION" | "RATE_LIMITED" };

/** parse (Zod) → rate limit (30/min, doc 09) → service → DTO. */
export async function priceCartAction(input: unknown): Promise<PriceCartResult> {
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };

  const limit = await limitAction("cart", 30);
  if (!limit.ok) return { ok: false, code: "RATE_LIMITED" };

  return { ok: true, cart: await priceGuestCart(parsed.data) };
}

/**
 * Signed-in users: merge the browser cart into the saved cart and return the result (the browser
 * then shows it). Guests — and anyone over the limit — get null and keep their browser cart.
 */
export async function syncCartAction(input: unknown): Promise<CartItemInput[] | null> {
  const user = await getCurrentUser();
  if (!user || !(await limitAction("cart:save", 60, user.id)).ok) return null;
  const parsed = cartItemsSchema.safeParse(input);
  return syncMyCart(parsed.success ? parsed.data : []);
}

/** Signed-in users: replace the saved cart with the browser cart. Guests: no-op. */
export async function saveCartAction(input: unknown): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !(await limitAction("cart:save", 60, user.id)).ok) return;
  const parsed = cartItemsSchema.safeParse(input);
  if (parsed.success) await saveMyCart(parsed.data);
}

/** Checkout summary: the signed-in user's saved cart, priced on the server for the delivery method. */
export async function priceCheckoutAction(deliveryMethod: unknown): Promise<PricedCartDTO | null> {
  const user = await getCurrentUser();
  if (!user || !(await limitAction("cart:checkout", 30, user.id)).ok) return null;
  const method: DeliveryMethod = deliveryMethod === "express" ? "express" : "standard";
  return priceMyCart(method);
}
