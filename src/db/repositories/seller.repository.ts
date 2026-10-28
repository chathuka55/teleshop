import type { Types } from "mongoose";
import type { SellerCardDTO, SellerProfileDTO } from "@/modules/catalog/types";
import { connectDB } from "../mongoose";
import { ProductModel } from "../models/product.model";
import { SellerModel } from "../models/seller.model";
import {
  toSellerCardDTO,
  toSellerProfileDTO,
  type LeanSeller,
  type LeanSellerProfile,
} from "./catalog-mappers";
import { $in } from "../operators";

const PUBLIC_FIELDS =
  "shopName slug shopType address.city address.district establishedYear tags rating coverUrl createdAt";

/** Shop page: public fields only — never businessRegNo, payoutAccount or approval details. */
const PROFILE_FIELDS = `${PUBLIC_FIELDS} address.line1 description phone photos location openingHours settings.acceptsCod`;

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

export async function findApprovedSellerProfileBySlug(slug: string): Promise<SellerProfileDTO | null> {
  await connectDB();
  const s = await SellerModel.findOne({ slug, approvalStatus: "approved" })
    .select(PROFILE_FIELDS)
    .lean<LeanSellerProfile>();
  if (!s) return null;
  const counts = await productCounts([s._id]);
  return toSellerProfileDTO(s, counts.get(s._id.toString()) ?? 0);
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

export type OwnedShop = { shopName: string; approvalStatus: string };

/** Shop name and approval status per owner user id (any status) — for the db:set-password CLI. */
export async function findShopsByOwnerIds(userIds: string[]): Promise<Map<string, OwnedShop>> {
  await connectDB();
  const shops = await SellerModel.find({ userId: $in(userIds) })
    .select("userId shopName approvalStatus")
    .lean<{ userId: Types.ObjectId; shopName: string; approvalStatus: string }[]>();
  return new Map(
    shops.map((s) => [s.userId.toString(), { shopName: s.shopName, approvalStatus: s.approvalStatus }]),
  );
}

/** The approved shop owned by `userId`, if any — goes into the session as `sellerId`. */
export async function findApprovedSellerIdByUserId(userId: string): Promise<string | null> {
  await connectDB();
  const s = await SellerModel.findOne({ userId, approvalStatus: "approved" })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return s ? s._id.toString() : null;
}
