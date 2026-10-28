import { Types } from "mongoose";
import type { PackageStatus } from "@/modules/orders/types";
import type { ShopApplicationDTO, ShopSettingsDTO } from "@/modules/sellers/types";
import { connectDB } from "../mongoose";
import { OrderModel } from "../models/order.model";
import { PayoutModel } from "../models/payout.model";
import { SellerModel } from "../models/seller.model";
import { $gte } from "../operators";

/**
 * The shop's own record and money (P6-T01, T02, T05). Every function takes the seller (or owner
 * user) id as a required argument; public shop pages keep using seller.repository.
 */

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);
const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

type LeanShop = {
  _id: Types.ObjectId;
  shopName: string;
  slug: string;
  shopType: ShopSettingsDTO["shopType"];
  description?: string;
  openingHours?: string;
  phone: string;
  address: { line1: string; city: string; district: string; postalCode?: string | null };
  tags?: string[];
  coverUrl?: string | null;
  settings?: { dispatchDays?: number };
  payoutAccount?: { bank?: string; branch?: string; last4?: string } | null;
  rating?: { average: number; count: number };
};

export async function findOwnShop(sellerId: string): Promise<ShopSettingsDTO | null> {
  if (!isId(sellerId)) return null;
  await connectDB();
  const s = await SellerModel.findById(sellerId)
    .select(
      "shopName slug shopType description openingHours phone address tags coverUrl settings payoutAccount rating",
    )
    .lean<LeanShop>();
  if (!s) return null;
  return {
    shopName: s.shopName,
    slug: s.slug,
    shopType: s.shopType,
    description: s.description ?? "",
    openingHours: s.openingHours ?? "",
    phone: s.phone,
    address: {
      line1: s.address.line1,
      city: s.address.city,
      district: s.address.district,
      postalCode: s.address.postalCode ?? "",
    },
    tags: s.tags ?? [],
    coverUrl: s.coverUrl ?? null,
    dispatchDays: s.settings?.dispatchDays ?? 2,
    payoutAccount: s.payoutAccount?.last4
      ? {
          bank: s.payoutAccount.bank ?? "",
          branch: s.payoutAccount.branch ?? "",
          last4: s.payoutAccount.last4,
        }
      : null,
    rating: s.rating ?? { average: 0, count: 0 },
  };
}

export async function updateOwnShop(
  sellerId: string,
  fields: {
    description: string;
    openingHours: string;
    phone: string;
    address: { line1: string; city: string; district: string; postalCode: string | null };
    tags: string[];
    dispatchDays: number;
    payoutAccount: { bank: string; branch: string; last4: string } | null;
  },
): Promise<boolean> {
  if (!isId(sellerId)) return false;
  await connectDB();
  const r = await SellerModel.updateOne(
    { _id: oid(sellerId), approvalStatus: "approved" },
    {
      $set: {
        description: fields.description,
        openingHours: fields.openingHours,
        phone: fields.phone,
        address: fields.address,
        tags: fields.tags,
        "settings.dispatchDays": fields.dispatchDays,
        payoutAccount: fields.payoutAccount,
      },
    },
    { runValidators: true },
  );
  return r.matchedCount === 1;
}

/** Sets the cover photo; returns the previous URL (so the caller can delete its own old file). */
export async function setShopCover(
  sellerId: string,
  url: string | null,
): Promise<{ previous: string | null } | null> {
  if (!isId(sellerId)) return null;
  await connectDB();
  const before = await SellerModel.findOneAndUpdate(
    { _id: oid(sellerId), approvalStatus: "approved" },
    { $set: { coverUrl: url } },
    { new: false },
  )
    .select("coverUrl")
    .lean<{ coverUrl?: string | null }>();
  return before ? { previous: before.coverUrl ?? null } : null;
}

// ---- Money: sales summary and payouts ----

export type PackageTotals = Record<
  PackageStatus,
  { packages: number; itemsCents: number; deliveryCents: number }
>;

const emptyTotals = (): PackageTotals =>
  Object.fromEntries(
    [
      "pending",
      "confirmed",
      "processing",
      "ready_to_ship",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ].map((s) => [s, { packages: 0, itemsCents: 0, deliveryCents: 0 }]),
  ) as PackageTotals;

/** The shop's packages by status (optionally only orders placed since `since`). */
export async function sellerPackageTotals(sellerId: string, since?: Date): Promise<PackageTotals> {
  const out = emptyTotals();
  if (!isId(sellerId)) return out;
  await connectDB();
  const seller = oid(sellerId);
  const rows = await OrderModel.aggregate<{ _id: PackageStatus; n: number; items: number; delivery: number }>(
    [
      { $match: { "packages.sellerId": seller, ...(since ? { placedAt: $gte(since) } : {}) } },
      { $unwind: "$packages" },
      { $match: { "packages.sellerId": seller } },
      {
        $group: {
          _id: "$packages.status",
          n: { $sum: 1 },
          items: { $sum: "$packages.subtotalCents" },
          delivery: { $sum: "$packages.deliveryCents" },
        },
      },
    ],
  );
  for (const r of rows) out[r._id] = { packages: r.n, itemsCents: r.items, deliveryCents: r.delivery };
  return out;
}

export type PayoutRow = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: "scheduled" | "paid";
  paidAt: Date | null;
  reference: string | null;
};

export async function listSellerPayouts(sellerId: string, limit = 24): Promise<PayoutRow[]> {
  if (!isId(sellerId)) return [];
  await connectDB();
  const rows = await PayoutModel.find({ sellerId: oid(sellerId) })
    .sort({ periodStart: -1 })
    .limit(limit)
    .lean<(Omit<PayoutRow, "id"> & { _id: Types.ObjectId })[]>();
  return rows.map(({ _id, ...r }) => ({
    ...r,
    id: _id.toString(),
    paidAt: r.paidAt ?? null,
    reference: r.reference ?? null,
  }));
}

// ---- Seller application (P6-T01) ----

export async function findApplicationByUser(userId: string): Promise<ShopApplicationDTO | null> {
  if (!isId(userId)) return null;
  await connectDB();
  const s = await SellerModel.findOne({ userId: oid(userId) })
    .select("shopName approvalStatus rejectionReason createdAt")
    .lean<{
      shopName: string;
      approvalStatus: ShopApplicationDTO["status"];
      rejectionReason?: string | null;
      createdAt: Date;
    }>();
  return s
    ? {
        shopName: s.shopName,
        status: s.approvalStatus,
        rejectionReason: s.rejectionReason ?? null,
        submittedAt: s.createdAt.toISOString(),
      }
    : null;
}

export async function shopSlugTaken(slug: string): Promise<boolean> {
  await connectDB();
  return (await SellerModel.countDocuments({ slug })) > 0;
}

export type NewApplication = {
  shopName: string;
  shopType: ShopSettingsDTO["shopType"];
  businessRegNo: string;
  address: { line1: string; city: string; district: string };
  phone: string;
};

export async function createApplication(userId: string, slug: string, a: NewApplication): Promise<string> {
  await connectDB();
  const doc = await SellerModel.create({ ...a, userId: oid(userId), slug, approvalStatus: "pending" });
  return doc._id.toString();
}

/** A rejected shop may fix its details and apply again (back to pending). */
export async function resubmitApplication(userId: string, a: NewApplication): Promise<string | null> {
  if (!isId(userId)) return null;
  await connectDB();
  const doc = await SellerModel.findOneAndUpdate(
    { userId: oid(userId), approvalStatus: "rejected" },
    { $set: { ...a, approvalStatus: "pending", rejectionReason: null } },
    { new: true, runValidators: true },
  )
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  return doc?._id.toString() ?? null;
}
