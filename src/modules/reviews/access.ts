import type { PackageStatus } from "@/modules/orders/types";

/** Verified purchase: only items from a delivered package can be reviewed (docs/08 reviews). */
export function canReviewPackage(status: PackageStatus): boolean {
  return status === "delivered";
}

/** A shop owner never rates their own products, even ones they bought themselves. */
export function isOwnProduct(user: { sellerId: string | null }, productSellerId: string): boolean {
  return !!user.sellerId && user.sellerId === productSellerId;
}
