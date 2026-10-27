import "server-only";
import { getSettings } from "@/db/repositories/settings.repository";
import { getProductsBySkus } from "@/modules/catalog/service";
import { priceCart } from "./pricing";
import type { CartItemInput, DeliveryMethod, PricedCartDTO } from "./types";

/** Prices a cart from the catalogue + settings. Prices sent by the client are never read. */
export async function priceItems(
  items: readonly CartItemInput[],
  deliveryMethod: DeliveryMethod = "standard",
): Promise<PricedCartDTO> {
  const [products, settings] = await Promise.all([getProductsBySkus(items.map((i) => i.sku)), getSettings()]);
  const express = deliveryMethod === "express";
  return priceCart(items, products, {
    deliveryFeeCents: express ? settings.expressFeeCents : settings.deliveryFeeCents,
    honourFreeDelivery: !express,
  });
}

/** Guest cart (browser copy). */
export async function priceGuestCart(items: readonly CartItemInput[]): Promise<PricedCartDTO> {
  return priceItems(items);
}

/** Delivery fees + whether Cash on Delivery is on, for the checkout page. */
export async function getCheckoutOptions(): Promise<{
  fees: Record<DeliveryMethod, number>;
  codEnabled: boolean;
}> {
  const s = await getSettings();
  return { fees: { standard: s.deliveryFeeCents, express: s.expressFeeCents }, codEnabled: s.codEnabled };
}
