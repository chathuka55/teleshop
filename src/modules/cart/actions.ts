"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/security/rate-limit";
import { cartItemsSchema } from "./schema";
import { priceGuestCart } from "./service";
import type { PricedCartDTO } from "./types";

export type PriceCartResult =
  { ok: true; cart: PricedCartDTO } | { ok: false; code: "VALIDATION" | "RATE_LIMITED" };

/** parse (Zod) → rate limit (30/min, doc 09) → service → DTO. */
export async function priceCartAction(input: unknown): Promise<PriceCartResult> {
  const parsed = cartItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit(`cart:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return { ok: false, code: "RATE_LIMITED" };

  return { ok: true, cart: await priceGuestCart(parsed.data) };
}
