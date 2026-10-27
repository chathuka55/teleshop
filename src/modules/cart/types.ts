import type { ProductCardDTO } from "@/modules/catalog/types";

export type DeliveryMethod = "standard" | "express";

/** What the browser is allowed to keep: SKUs and quantities only, never prices. */
export type CartItemInput = { sku: string; qty: number };

export type CartLineDTO = {
  sku: string;
  qty: number;
  productSlug: string;
  name: string;
  variantLabel: string;
  art: ProductCardDTO["art"];
  imageUrl: string | null;
  unitPriceCents: number;
  compareAtCents: number | null;
  lineTotalCents: number;
  available: number;
  /** qty was lowered to what is in stock */
  adjusted: boolean;
};

export type CartPackageDTO = {
  seller: { slug: string; shopName: string };
  lines: CartLineDTO[];
  subtotalCents: number;
  deliveryCents: number;
};

export type PricedCartDTO = {
  packages: CartPackageDTO[];
  /** SKUs that no longer exist or are out of stock */
  unavailable: string[];
  itemCount: number;
  subtotalCents: number;
  deliveryCents: number;
  savingsCents: number;
  totalCents: number;
};
