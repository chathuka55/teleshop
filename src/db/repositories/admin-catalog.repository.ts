import { Types, type ClientSession } from "mongoose";
import type {
  AdminProductDTO,
  AdminProductRowDTO,
  AdminSellerDTO,
  AdminSellerRowDTO,
} from "@/modules/admin/types";
import type { ProductStatus } from "@/modules/products/types";
import { connectDB } from "../mongoose";
import { BrandModel } from "../models/brand.model";
import { CategoryModel } from "../models/category.model";
import { ProductModel } from "../models/product.model";
import { SellerModel } from "../models/seller.model";
import { UserModel } from "../models/user.model";
import { $in } from "../operators";
import type { LeanProduct } from "./catalog-mappers";

/** Admin reads and writes for shop approvals (A10) and product moderation (A5/A6). Admin-only. */

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);
const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

type SellerStatus = AdminSellerRowDTO["status"];

type LeanSellerAdmin = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  shopName: string;
  slug: string;
  shopType: AdminSellerRowDTO["shopType"];
  businessRegNo: string;
  phone: string;
  address: { line1: string; city: string; district: string; postalCode?: string | null };
  approvalStatus: SellerStatus;
  rejectionReason?: string | null;
  approvedAt?: Date | null;
  documents?: { kind: string; contentType: string; size: number; uploadedAt: Date }[];
  createdAt: Date;
};

async function owners(ids: Types.ObjectId[]) {
  const users = await UserModel.find({ _id: $in(ids) })
    .select("name email emailVerified")
    .lean<{ _id: Types.ObjectId; name: string; email: string; emailVerified?: Date | null }[]>();
  return new Map(users.map((u) => [u._id.toString(), u]));
}

export async function listSellersByStatus(status: SellerStatus, limit = 100): Promise<AdminSellerRowDTO[]> {
  await connectDB();
  const rows = await SellerModel.find({ approvalStatus: status })
    .sort({ createdAt: status === "pending" ? 1 : -1 })
    .limit(limit)
    .select("userId shopName slug shopType businessRegNo address approvalStatus documents createdAt")
    .lean<LeanSellerAdmin[]>();
  const users = await owners(rows.map((r) => r.userId));
  return rows.map((s) => ({
    id: s._id.toString(),
    shopName: s.shopName,
    shopType: s.shopType,
    ownerName: users.get(s.userId.toString())?.name ?? "—",
    ownerEmail: users.get(s.userId.toString())?.email ?? "—",
    city: s.address.city,
    district: s.address.district,
    businessRegNo: s.businessRegNo,
    status: s.approvalStatus,
    hasDocument: (s.documents ?? []).length > 0,
    appliedAt: s.createdAt.toISOString(),
  }));
}

export async function countSellersByStatus(status: SellerStatus): Promise<number> {
  await connectDB();
  return SellerModel.countDocuments({ approvalStatus: status });
}

export async function findSellerForAdmin(id: string): Promise<AdminSellerDTO | null> {
  if (!isId(id)) return null;
  await connectDB();
  const s = await SellerModel.findById(id)
    .select(
      "userId shopName slug shopType businessRegNo phone address approvalStatus rejectionReason approvedAt documents createdAt",
    )
    .lean<LeanSellerAdmin>();
  if (!s) return null;
  const owner = (await owners([s.userId])).get(s.userId.toString());
  const doc = (s.documents ?? []).findLast((d) => d.kind === "business_registration");
  return {
    id: s._id.toString(),
    userId: s.userId.toString(),
    shopName: s.shopName,
    slug: s.slug,
    shopType: s.shopType,
    ownerName: owner?.name ?? "—",
    ownerEmail: owner?.email ?? "—",
    ownerEmailVerified: !!owner?.emailVerified,
    city: s.address.city,
    district: s.address.district,
    addressLine1: s.address.line1,
    postalCode: s.address.postalCode ?? null,
    phone: s.phone,
    businessRegNo: s.businessRegNo,
    status: s.approvalStatus,
    hasDocument: !!doc,
    document: doc
      ? { contentType: doc.contentType, size: doc.size, uploadedAt: doc.uploadedAt.toISOString() }
      : null,
    rejectionReason: s.rejectionReason ?? null,
    approvedAt: s.approvedAt?.toISOString() ?? null,
    appliedAt: s.createdAt.toISOString(),
  };
}

/** pending|rejected → approved, and the owner becomes a seller — one transaction. */
export async function approveSeller(
  id: string,
  adminId: string,
  at: Date,
  session: ClientSession,
): Promise<boolean> {
  const s = await SellerModel.findOneAndUpdate(
    { _id: oid(id), approvalStatus: $in(["pending", "rejected"]) },
    { $set: { approvalStatus: "approved", approvedBy: oid(adminId), approvedAt: at, rejectionReason: null } },
    { new: true, session },
  )
    .select("userId")
    .lean<{ userId: Types.ObjectId }>();
  if (!s) return false;
  // Customers become sellers; an admin owner (shouldn't exist) keeps the admin role.
  await UserModel.updateOne({ _id: s.userId, role: "customer" }, { $set: { role: "seller" } }, { session });
  return true;
}

export async function rejectSeller(id: string, reason: string): Promise<boolean> {
  if (!isId(id)) return false;
  await connectDB();
  const r = await SellerModel.updateOne(
    { _id: oid(id), approvalStatus: "pending" },
    { $set: { approvalStatus: "rejected", rejectionReason: reason } },
  );
  return r.modifiedCount === 1;
}

// ---- Product moderation ----

type LeanAdminProduct = LeanProduct & {
  status: ProductStatus;
  moderationNote?: string | null;
  updatedAt: Date;
};

export async function listProductsByStatus(
  status: ProductStatus,
  limit = 100,
): Promise<AdminProductRowDTO[]> {
  await connectDB();
  const rows = await ProductModel.find({ status })
    .sort({ updatedAt: status === "pending_review" ? 1 : -1 })
    .limit(limit)
    .select(
      "sellerId categoryId name slug images variants.priceCents variants.isActive status publishedAt updatedAt",
    )
    .lean<LeanAdminProduct[]>();
  const [shops, cats] = await Promise.all([
    SellerModel.find({ _id: $in(rows.map((r) => r.sellerId)) })
      .select("shopName")
      .lean<{ _id: Types.ObjectId; shopName: string }[]>(),
    CategoryModel.find({ _id: $in(rows.map((r) => r.categoryId)) })
      .select("name")
      .lean<{ _id: Types.ObjectId; name: string }[]>(),
  ]);
  const shop = new Map(shops.map((s) => [s._id.toString(), s.shopName]));
  const cat = new Map(cats.map((c) => [c._id.toString(), c.name]));
  return rows.map((p) => {
    const prices = p.variants.filter((v) => v.isActive).map((v) => v.priceCents);
    return {
      id: p._id.toString(),
      name: p.name,
      shopName: shop.get(p.sellerId.toString()) ?? "—",
      categoryName: cat.get(p.categoryId.toString()) ?? "—",
      imageUrl: p.images?.[0]?.url ?? null,
      minPriceCents: prices.length ? Math.min(...prices) : p.basePriceCents,
      status: p.status,
      /** Already approved once → this review is for a big price change. */
      wasPublished: !!p.publishedAt,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

export async function countProductsByStatus(status: ProductStatus): Promise<number> {
  await connectDB();
  return ProductModel.countDocuments({ status });
}

export async function findProductForAdmin(id: string): Promise<AdminProductDTO | null> {
  if (!isId(id)) return null;
  await connectDB();
  const p = await ProductModel.findById(id).lean<LeanAdminProduct>();
  if (!p) return null;
  const [shop, cat, brand] = await Promise.all([
    SellerModel.findById(p.sellerId)
      .select("shopName slug userId")
      .lean<{ shopName: string; slug: string; userId: Types.ObjectId }>(),
    CategoryModel.findById(p.categoryId)
      .select("name specTemplate")
      .lean<{ name: string; specTemplate?: { key: string; label: string }[] }>(),
    BrandModel.findById(p.brandId).select("name").lean<{ name: string }>(),
  ]);
  const labels = new Map((cat?.specTemplate ?? []).map((f) => [f.key, f.label]));
  return {
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    status: p.status,
    moderationNote: p.moderationNote ?? null,
    wasPublished: !!p.publishedAt,
    sellerId: p.sellerId.toString(),
    shopName: shop?.shopName ?? "—",
    shopSlug: shop?.slug ?? "",
    categoryName: cat?.name ?? "—",
    brandName: brand?.name ?? "—",
    condition: p.condition,
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    highlights: p.highlights ?? [],
    specs: Object.entries(p.specs ?? {}).map(([k, v]) => ({ label: labels.get(k) ?? k, value: v })),
    warranty: p.warranty ?? { months: 0, type: "none" },
    images: (p.images ?? []).map((i) => i.url),
    variants: p.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents ?? null,
      isActive: v.isActive,
    })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Moves a product between statuses (only from `from`). Returns the owner shop id, or null. */
export async function setProductModeration(
  id: string,
  from: readonly ProductStatus[],
  to: ProductStatus,
  note: string | null,
  at: Date,
): Promise<string | null> {
  if (!isId(id)) return null;
  await connectDB();
  const set: Record<string, unknown> = { status: to, moderationNote: note };
  const p = await ProductModel.findOneAndUpdate(
    { _id: oid(id), status: $in(from) },
    to === "published"
      ? [{ $set: { ...set, publishedAt: { $ifNull: ["$publishedAt", at] } } }]
      : { $set: set },
    { new: true },
  )
    .select("sellerId")
    .lean<{ sellerId: Types.ObjectId }>();
  return p?.sellerId.toString() ?? null;
}
