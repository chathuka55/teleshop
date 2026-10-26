import type { Types } from "mongoose";
import type { SellerCardDTO } from "@/modules/catalog/types";
import { connectDB } from "../mongoose";
import { ProductModel } from "../models/product.model";
import { SellerModel } from "../models/seller.model";
import { toSellerCardDTO, type LeanSeller } from "./catalog-mappers";
import { $in } from "../operators";

const PUBLIC_FIELDS =
  "shopName slug shopType address.city address.district establishedYear tags rating createdAt";

async function productCounts(sellerIds: Types.ObjectId[]): Promise<Map<string, number>> {
  const rows = await ProductModel.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { status: "published", sellerId: { $in: sellerIds } } },
    { $group: { _id: "$sellerId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.n]));
}

/** Approved shops only — pending/suspended sellers are never shown publicly. */
export async function listApprovedSellers(limit = 50): Promise<SellerCardDTO[]> {
  await connectDB();
  const sellers = await SellerModel.find({ approvalStatus: "approved" })
    .select(PUBLIC_FIELDS)
    .sort({ "rating.count": -1 })
    .limit(limit)
    .lean<LeanSeller[]>();
  const counts = await productCounts(sellers.map((s) => s._id));
  return sellers.map((s) => toSellerCardDTO(s, counts.get(s._id.toString()) ?? 0));
}

export async function findApprovedSellerBySlug(slug: string): Promise<SellerCardDTO | null> {
  await connectDB();
  const s = await SellerModel.findOne({ slug, approvalStatus: "approved" })
    .select(PUBLIC_FIELDS)
    .lean<LeanSeller>();
  if (!s) return null;
  const counts = await productCounts([s._id]);
  return toSellerCardDTO(s, counts.get(s._id.toString()) ?? 0);
}

export async function findLeanSellers(filter: {
  ids?: Types.ObjectId[];
  slugs?: string[];
}): Promise<LeanSeller[]> {
  await connectDB();
  if (filter.ids)
    return SellerModel.find({ _id: $in(filter.ids) })
      .select(PUBLIC_FIELDS)
      .lean<LeanSeller[]>();
  if (filter.slugs)
    return SellerModel.find({ slug: $in(filter.slugs) })
      .select(PUBLIC_FIELDS)
      .lean<LeanSeller[]>();
  return [];
}

/** The approved shop owned by `userId`, if any — goes into the session as `sellerId`. */
export async function findApprovedSellerIdByUserId(userId: string): Promise<string | null> {
  await connectDB();
  const s = await SellerModel.findOne({ userId, approvalStatus: "approved" })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return s ? s._id.toString() : null;
}
