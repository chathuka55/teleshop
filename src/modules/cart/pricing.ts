import { sumCents } from "@/lib/utils/money";
import type { ProductDetailDTO } from "@/modules/catalog/types";
import type { CartItemInput, CartLineDTO, CartPackageDTO, PricedCartDTO } from "./types";

export const DEFAULT_DELIVERY_FEE_CENTS = 45_000; // settings.deliveryFeeCents default (docs/08 §3.1)

/**
 * Prices a cart from catalogue data. Pure: every number comes from `products`, nothing from the
 * client. One package (and one delivery fee) per seller, like the order split in placeOrder.
 */
export function priceCart(
  items: readonly CartItemInput[],
  products: readonly ProductDetailDTO[],
  { deliveryFeeCents = DEFAULT_DELIVERY_FEE_CENTS }: { deliveryFeeCents?: number } = {},
): PricedCartDTO {
  const bySku = new Map(
    products.flatMap((p) => p.variants.map((v) => [v.sku, { product: p, variant: v }] as const)),
  );

  // Merge duplicate SKUs (e.g. added twice) before pricing.
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.sku, (merged.get(i.sku) ?? 0) + i.qty);

  const unavailable: string[] = [];
  const packages = new Map<string, CartPackageDTO>();
  let savingsCents = 0;

  for (const [sku, wanted] of merged) {
    const hit = bySku.get(sku);
    if (!hit || !hit.variant.inStock || hit.variant.available < 1) {
      unavailable.push(sku);
      continue;
    }
    const { product, variant } = hit;
    const qty = Math.min(wanted, variant.available, 10);
    const line: CartLineDTO = {
      sku,
      qty,
      productSlug: product.slug,
      // Product names carry the default variant ("… · 256GB Cosmic Orange"); the line shows its own variant.
      name: product.name.split(" · ")[0] ?? product.name,
      variantLabel: variant.label,
      art: product.art,
      imageUrl: product.imageUrl,
      unitPriceCents: variant.priceCents,
      compareAtCents: variant.compareAtCents,
      lineTotalCents: variant.priceCents * qty,
      available: variant.available,
      adjusted: qty !== wanted,
    };
    if (variant.compareAtCents && variant.compareAtCents > variant.priceCents) {
      savingsCents += (variant.compareAtCents - variant.priceCents) * qty;
    }
    const key = product.seller.slug;
    const pkg = packages.get(key) ?? {
      seller: product.seller,
      lines: [],
      subtotalCents: 0,
      deliveryCents: product.freeDelivery ? 0 : deliveryFeeCents,
    };
    pkg.lines.push(line);
    pkg.subtotalCents = sumCents(pkg.lines.map((l) => l.lineTotalCents));
    // A package ships free only if every product in it ships free.
    if (!product.freeDelivery) pkg.deliveryCents = deliveryFeeCents;
    packages.set(key, pkg);
  }

  const list = [...packages.values()];
  const subtotalCents = sumCents(list.map((p) => p.subtotalCents));
  const deliveryCents = sumCents(list.map((p) => p.deliveryCents));
  return {
    packages: list,
    unavailable,
    itemCount: list.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.qty, 0), 0),
    subtotalCents,
    deliveryCents,
    savingsCents,
    totalCents: subtotalCents + deliveryCents,
  };
}
