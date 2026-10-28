import type { Types } from "mongoose";
import { SellerModel } from "../models/seller.model";
import { $in, $nin } from "../operators";

/**
 * What the storefront may show: published products of approved shops only (P7-T04). A suspended
 * (or not yet approved) shop's products disappear from search, product pages, carts and checkout
 * without touching their own status, so reinstating the shop brings them straight back.
 */
export async function liveProductFilter(): Promise<Record<string, unknown>> {
  const hidden: Types.ObjectId[] = await SellerModel.distinct("_id", {
    approvalStatus: $in(["pending", "rejected", "suspended"]),
  });
  return hidden.length ? { status: "published", sellerId: $nin(hidden) } : { status: "published" };
}
