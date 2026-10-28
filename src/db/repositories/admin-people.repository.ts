import { Types, type ClientSession } from "mongoose";
import type { AdminCustomerDTO, AdminReviewDTO, AuditEntryDTO, Paged } from "@/modules/admin/types";
import { connectDB } from "../mongoose";
import { AuditLogModel } from "../models/audit-log.model";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { ReviewModel } from "../models/review.model";
import { SellerModel } from "../models/seller.model";
import { UserModel } from "../models/user.model";
import { $in } from "../operators";

/** Admin reads and writes for people (A9), shops' suspension (A10), reviews (A11), audit (A14). */

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);
const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);
/** User text → a literal, case-insensitive "contains" pattern (escaped: no regex injection). */
const contains = (q: string): RegExp =>
  // eslint-disable-next-line security/detect-non-literal-regexp -- escaped user text, max 80 chars
  new RegExp(q.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

// ---- Customers (A9) ----

type LeanUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  role: AdminCustomerDTO["role"];
  status: AdminCustomerDTO["status"];
  emailVerified?: Date | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
};

export async function listUsersForAdmin(f: {
  q: string;
  role?: AdminCustomerDTO["role"];
  status?: AdminCustomerDTO["status"];
  page: number;
  pageSize: number;
}): Promise<Paged<AdminCustomerDTO>> {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (f.role) match.role = f.role;
  if (f.status) match.status = f.status;
  if (f.q) {
    const phone = f.q.replace(/[\s()-]/g, "").match(/^(?:\+94|94|0)?(7\d{8})$/);
    match.$or = phone ? [{ phone: `+94${phone[1]}` }] : [{ email: contains(f.q) }, { name: contains(f.q) }];
  }
  const [users, total] = await Promise.all([
    UserModel.find(match)
      .sort({ createdAt: -1 })
      .skip((f.page - 1) * f.pageSize)
      .limit(f.pageSize)
      .select("name email phone role status emailVerified createdAt lastLoginAt")
      .lean<LeanUser[]>(),
    UserModel.countDocuments(match),
  ]);
  const ids = users.map((u) => u._id);
  const [orders, shops] = await Promise.all([
    OrderModel.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { customerId: { $in: ids } } },
      { $group: { _id: "$customerId", n: { $sum: 1 } } },
    ]),
    SellerModel.find({ userId: $in(ids) })
      .select("userId shopName")
      .lean<{ userId: Types.ObjectId; shopName: string }[]>(),
  ]);
  const orderCount = new Map(orders.map((o) => [o._id.toString(), o.n]));
  const shopName = new Map(shops.map((s) => [s.userId.toString(), s.shopName]));
  return {
    total,
    page: f.page,
    pageSize: f.pageSize,
    rows: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role,
      status: u.status,
      emailVerified: !!u.emailVerified,
      joinedAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      orderCount: orderCount.get(u._id.toString()) ?? 0,
      shopName: shopName.get(u._id.toString()) ?? null,
    })),
  };
}

export async function findUserRole(id: string): Promise<{
  role: AdminCustomerDTO["role"];
  status: AdminCustomerDTO["status"];
  email: string;
  name: string;
} | null> {
  if (!isId(id)) return null;
  await connectDB();
  return UserModel.findById(id).select("role status email name").lean<{
    role: AdminCustomerDTO["role"];
    status: AdminCustomerDTO["status"];
    email: string;
    name: string;
  }>();
}

/**
 * Suspends (signs out everywhere: tokenVersion bump) or reactivates a non-admin account.
 * Conditional on the current status, so a double click changes nothing twice.
 */
export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<boolean> {
  if (!isId(id)) return false;
  await connectDB();
  const r = await UserModel.updateOne(
    { _id: oid(id), role: $in(["customer", "seller"]), status: status === "active" ? "suspended" : "active" },
    status === "suspended" ? { $set: { status }, $inc: { tokenVersion: 1 } } : { $set: { status } },
  );
  return r.modifiedCount === 1;
}

// ---- Shop suspension (A10) ----

/** approved ⇄ suspended. The storefront hides a suspended shop's products (storefront-filter). */
export async function setShopSuspended(id: string, suspend: boolean, reason: string): Promise<boolean> {
  if (!isId(id)) return false;
  await connectDB();
  const r = await SellerModel.updateOne(
    { _id: oid(id), approvalStatus: suspend ? "approved" : "suspended" },
    {
      $set: { approvalStatus: suspend ? "suspended" : "approved", rejectionReason: suspend ? reason : null },
    },
  );
  return r.modifiedCount === 1;
}

/** Packages of this shop still to be handled (shown before suspending). */
export async function countOpenShopPackages(sellerId: string): Promise<number> {
  if (!isId(sellerId)) return 0;
  await connectDB();
  const seller = oid(sellerId);
  const rows = await OrderModel.aggregate<{ n: number }>([
    { $match: { "packages.sellerId": seller } },
    { $unwind: "$packages" },
    {
      $match: {
        "packages.sellerId": seller,
        "packages.status": { $in: ["pending", "confirmed", "processing", "ready_to_ship", "shipped"] },
      },
    },
    { $count: "n" },
  ]);
  return rows[0]?.n ?? 0;
}

// ---- Reviews (A11) ----

type LeanReview = {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  status: AdminReviewDTO["status"];
  createdAt: Date;
};

export async function listReviewsForAdmin(
  status: AdminReviewDTO["status"],
  page: number,
  pageSize: number,
): Promise<Paged<AdminReviewDTO>> {
  await connectDB();
  const [rows, total] = await Promise.all([
    ReviewModel.find({ status })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<LeanReview[]>(),
    ReviewModel.countDocuments({ status }),
  ]);
  const [products, shops, users, orders] = await Promise.all([
    ProductModel.find({ _id: $in(rows.map((r) => r.productId)) })
      .select("name slug")
      .lean<{ _id: Types.ObjectId; name: string; slug: string }[]>(),
    SellerModel.find({ _id: $in(rows.map((r) => r.sellerId)) })
      .select("shopName")
      .lean<{ _id: Types.ObjectId; shopName: string }[]>(),
    UserModel.find({ _id: $in(rows.map((r) => r.customerId)) })
      .select("name email")
      .lean<{ _id: Types.ObjectId; name: string; email: string }[]>(),
    OrderModel.find({ _id: $in(rows.map((r) => r.orderId)) })
      .select("orderNo")
      .lean<{ _id: Types.ObjectId; orderNo: string }[]>(),
  ]);
  const by = <T extends { _id: Types.ObjectId }>(xs: T[]) => new Map(xs.map((x) => [x._id.toString(), x]));
  const [P, S, U, O] = [by(products), by(shops), by(users), by(orders)];
  return {
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: r._id.toString(),
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      productName: P.get(r.productId.toString())?.name ?? "Removed product",
      productSlug: P.get(r.productId.toString())?.slug ?? "",
      shopName: S.get(r.sellerId.toString())?.shopName ?? "",
      customerName: U.get(r.customerId.toString())?.name ?? "",
      customerEmail: U.get(r.customerId.toString())?.email ?? "",
      orderNo: O.get(r.orderId.toString())?.orderNo ?? "",
    })),
  };
}

/** Changes a review's visibility; returns what the rating caches need, or null if unchanged. */
export async function setReviewStatus(
  id: string,
  from: AdminReviewDTO["status"][],
  to: AdminReviewDTO["status"],
  session: ClientSession,
): Promise<{ productId: string; sellerId: string; rating: number } | null> {
  if (!isId(id)) return null;
  const r = await ReviewModel.findOneAndUpdate(
    { _id: oid(id), status: $in(from) },
    { $set: { status: to } },
    { new: false, session },
  )
    .select("productId sellerId rating")
    .lean<{ productId: Types.ObjectId; sellerId: Types.ObjectId; rating: number }>();
  return r ? { productId: r.productId.toString(), sellerId: r.sellerId.toString(), rating: r.rating } : null;
}

// ---- Audit log (A14) ----

export async function listAuditLog(f: {
  action?: string;
  entityId?: string;
  actorEmail?: string;
  page: number;
  pageSize: number;
}): Promise<Paged<AuditEntryDTO>> {
  await connectDB();
  const match: Record<string, unknown> = {};
  // Prefix match on the action group ("order.", "seller."…): anchored and escaped.
  // eslint-disable-next-line security/detect-non-literal-regexp -- escaped allow-listed prefix
  if (f.action) match.action = new RegExp(`^${f.action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (f.entityId) match.entityId = f.entityId;
  if (f.actorEmail) {
    const u = await UserModel.findOne({ email: f.actorEmail.toLowerCase() })
      .select("_id")
      .lean<{ _id: Types.ObjectId }>();
    if (!u) return { rows: [], total: 0, page: f.page, pageSize: f.pageSize };
    match.actorId = u._id;
  }
  const [rows, total] = await Promise.all([
    AuditLogModel.find(match)
      .sort({ createdAt: -1 })
      .skip((f.page - 1) * f.pageSize)
      .limit(f.pageSize)
      .select("actorId actorRole action entity entityId data createdAt")
      .lean<
        {
          _id: Types.ObjectId;
          actorId: Types.ObjectId | null;
          actorRole: string;
          action: string;
          entity: string;
          entityId: string;
          data: unknown;
          createdAt: Date;
        }[]
      >(),
    AuditLogModel.countDocuments(match),
  ]);
  const actors = await UserModel.find({ _id: $in(rows.flatMap((r) => (r.actorId ? [r.actorId] : []))) })
    .select("email")
    .lean<{ _id: Types.ObjectId; email: string }[]>();
  const email = new Map(actors.map((a) => [a._id.toString(), a.email]));
  return {
    total,
    page: f.page,
    pageSize: f.pageSize,
    rows: rows.map((r) => ({
      id: r._id.toString(),
      at: r.createdAt.toISOString(),
      actorRole: r.actorRole,
      actorEmail: r.actorId ? (email.get(r.actorId.toString()) ?? null) : null,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      data: r.data && Object.keys(r.data as object).length ? JSON.stringify(r.data).slice(0, 300) : "",
    })),
  };
}
