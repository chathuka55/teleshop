import "server-only";
import { getSettings } from "@/db/repositories/settings.repository";
import { getProductsBySkus } from "@/modules/catalog/service";
import { priceCart } from "./pricing";
import type { CartItemInput, PricedCartDTO } from "./types";

/** Re-prices a cart from the catalogue + settings. Prices sent by the client are never read. */
export async function priceGuestCart(items: readonly CartItemInput[]): Promise<PricedCartDTO> {
  const [products, settings] = await Promise.all([getProductsBySkus(items.map((i) => i.sku)), getSettings()]);
  return priceCart(items, products, { deliveryFeeCents: settings.deliveryFeeCents });
}
