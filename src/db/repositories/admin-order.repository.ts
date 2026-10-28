import type { Types } from "mongoose";
import type {
  AdminOrderDTO,
  AdminOrderRowDTO,
  PaymentStatus,
  TrackingQueueItemDTO,
} from "@/modules/orders/admin-types";
import type { OrderStatus, PackageStatus, TimelineEntryDTO } from "@/modules/orders/types";
import { connectDB } from "../mongoose";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
import { PaymentModel } from "../models/payment.model";
import { SellerModel } from "../models/seller.model";
import { UserModel } from "../models/user.model";
import { $gte, $in } from "../operators";

/**
 * Admin reads of orders (P7-T01/T02). Admin-only: the services call requireRole("admin") first.
 * These are the only reads that return the customer's email next to the order.
 */

type LeanPkg = {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  status: PackageStatus;
  subtotalCents: number;
  deliveryCents: number;
  items: {
    _id: Types.ObjectId;
    sku: string;
    name: string;
    variantLabel: string;
    qty: number;
    unitPriceCents: number;
    lineTotalCents: number;
    serialNumbers?: string[];
  }[];
  shipment?: { courierName: string; trackingCode: string; trackingUrl: string; handedOverAt: Date } | null;
};

type LeanOrder = {
  _id: Types.ObjectId;
  orderNo: string;
  customerId: Types.ObjectId;
  placedAt: Date;
  status: OrderStatus;
  deliveryMethod: "standard" | "express";
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  cancelReason?: string | null;
  deliveryAddress: AdminOrderDTO["address"] & { line2?: string; postalCode?: string | null };
  packages: LeanPkg[];
};

type LeanShop = { _id: Types.ObjectId; shopName: string; slug: string; phone: string };

async function shopsById(ids: Types.ObjectId[]): Promise<Map<string, LeanShop>> {
  const shops = await SellerModel.find({ _id: $in(ids) })
    .select("shopName slug phone")
    .lean<LeanShop[]>();
  return new Map(shops.map((s) => [s._id.toString(), s]));
}

export type AdminOrderFilter = {
  status?: OrderStatus;
  /** Exact order number, E.164 phone, or customer email. */
  orderNo?: string;
  phone?: string;
  email?: string;
  page: number;
  pageSize: number;
};

export async function listAdminOrders(
  f: AdminOrderFilter,
): Promise<{ rows: AdminOrderRowDTO[]; total: number }> {
  await connectDB();
  const match: Record<string, unknown> = {};
  if (f.status) match.status = f.status;
  if (f.orderNo) match.orderNo = f.orderNo;
  if (f.phone) match["deliveryAddress.phone"] = f.phone;
  if (f.email) {
    const u = await UserModel.findOne({ email: f.email.toLowerCase() })
      .select("_id")
      .lean<{ _id: Types.ObjectId }>();
    if (!u) return { rows: [], total: 0 };
    match.customerId = u._id;
  }
  const [orders, total] = await Promise.all([
    OrderModel.find(match)
      .sort({ placedAt: -1 })
      .skip((f.page - 1) * f.pageSize)
      .limit(f.pageSize)
      .select("orderNo placedAt status totalCents deliveryAddress packages.sellerId packages.status")
      .lean<LeanOrder[]>(),
    OrderModel.countDocuments(match),
  ]);
  const shops = await shopsById(orders.flatMap((o) => o.packages.map((p) => p.sellerId)));
  return {
    total,
    rows: orders.map((o) => ({
      orderNo: o.orderNo,
      placedAt: o.placedAt.toISOString(),
      status: o.status,
      recipientName: o.deliveryAddress.recipientName,
      city: o.deliveryAddress.city,
      district: o.deliveryAddress.district,
      totalCents: o.totalCents,
      packages: o.packages.map((p) => ({
        sellerName: shops.get(p.sellerId.toString())?.shopName ?? "Teleshop seller",
        status: p.status,
      })),
    })),
  };
}

export async function findAdminOrder(orderNo: string): Promise<AdminOrderDTO | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo }).lean<LeanOrder>();
  if (!o) return null;
  const [shops, customer, payment, events] = await Promise.all([
    shopsById(o.packages.map((p) => p.sellerId)),
    UserModel.findById(o.customerId)
      .select("name email")
      .lean<{ _id: Types.ObjectId; name: string; email: string }>(),
    PaymentModel.findOne({ orderId: o._id }).select("status paidAt perPackage").lean<{
      status: PaymentStatus;
      paidAt?: Date | null;
      perPackage?: { packageId: Types.ObjectId; status: PaymentStatus; collectedAt?: Date | null }[];
    }>(),
    OrderEventModel.find({ orderId: o._id })
      .sort({ createdAt: 1, _id: 1 })
      .select("packageId toStatus note actorRole createdAt")
      .lean<
        {
          packageId: Types.ObjectId | null;
          toStatus: TimelineEntryDTO["status"];
          note: string;
          actorRole: string;
          createdAt: Date;
        }[]
      >(),
  ]);
  const perPackage = new Map((payment?.perPackage ?? []).map((p) => [p.packageId.toString(), p]));
  const a = o.deliveryAddress;
  return {
    orderNo: o.orderNo,
    placedAt: o.placedAt.toISOString(),
    status: o.status,
    deliveryMethod: o.deliveryMethod,
    subtotalCents: o.subtotalCents,
    deliveryCents: o.deliveryCents,
    totalCents: o.totalCents,
    cancelReason: o.cancelReason ?? null,
    customer: customer ? { id: customer._id.toString(), name: customer.name, email: customer.email } : null,
    address: {
      recipientName: a.recipientName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      district: a.district,
      postalCode: a.postalCode ?? null,
    },
    payment: payment ? { status: payment.status, paidAt: payment.paidAt?.toISOString() ?? null } : null,
    packages: o.packages.map((p) => {
      const shop = shops.get(p.sellerId.toString());
      const pay = perPackage.get(p._id.toString());
      return {
        id: p._id.toString(),
        sellerId: p.sellerId.toString(),
        sellerName: shop?.shopName ?? "Teleshop seller",
        sellerSlug: shop?.slug ?? "",
        sellerPhone: shop?.phone ?? "",
        status: p.status,
        subtotalCents: p.subtotalCents,
        deliveryCents: p.deliveryCents,
        payment: pay ? { status: pay.status, collectedAt: pay.collectedAt?.toISOString() ?? null } : null,
        shipment: p.shipment
          ? {
              courierName: p.shipment.courierName,
              trackingCode: p.shipment.trackingCode,
              trackingUrl: p.shipment.trackingUrl,
              handedOverAt: p.shipment.handedOverAt.toISOString(),
            }
          : null,
        items: p.items.map((i) => ({
          id: i._id.toString(),
          sku: i.sku,
          name: i.name,
          variantLabel: i.variantLabel,
          qty: i.qty,
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents,
          serialNumbers: i.serialNumbers ?? [],
        })),
      };
    }),
    timeline: events.map((e) => ({
      at: e.createdAt.toISOString(),
      status: e.toStatus,
      note: e.note,
      packageId: e.packageId?.toString() ?? null,
      actorRole: e.actorRole,
    })),
  };
}

/** Packages ready for courier pickup, oldest first — the "awaiting tracking code" queue (A2). */
export async function listTrackingQueue(limit = 20): Promise<TrackingQueueItemDTO[]> {
  await connectDB();
  const orders = await OrderModel.find({ "packages.status": "ready_to_ship" })
    .sort({ placedAt: 1 })
    .limit(limit)
    .select("_id orderNo placedAt deliveryAddress.city deliveryAddress.district packages")
    .lean<LeanOrder[]>();
  const pkgs = orders.flatMap((o) =>
    o.packages.filter((p) => p.status === "ready_to_ship").map((p) => ({ o, p })),
  );
  const [shops, events] = await Promise.all([
    shopsById(pkgs.map((x) => x.p.sellerId)),
    OrderEventModel.find({ packageId: $in(pkgs.map((x) => x.p._id)), toStatus: "ready_to_ship" })
      .select("packageId createdAt")
      .lean<{ packageId: Types.ObjectId; createdAt: Date }[]>(),
  ]);
  const since = new Map(events.map((e) => [e.packageId.toString(), e.createdAt]));
  return pkgs
    .map(({ o, p }) => ({
      orderNo: o.orderNo,
      packageId: p._id.toString(),
      sellerName: shops.get(p.sellerId.toString())?.shopName ?? "Teleshop seller",
      city: o.deliveryAddress.city,
      district: o.deliveryAddress.district,
      amountCents: p.subtotalCents + p.deliveryCents,
      readySince: (since.get(p._id.toString()) ?? o.placedAt).toISOString(),
    }))
    .sort((a, b) => a.readySince.localeCompare(b.readySince))
    .slice(0, limit);
}

export type AdminOrderCounts = {
  ordersToday: number;
  ordersMonth: number;
  deliveredMonthCents: number;
  packages: Record<PackageStatus, number>;
};

/** Headline numbers for the admin dashboard. `dayStart` / `monthStart` are Sri Lanka midnights. */
export async function adminOrderCounts(dayStart: Date, monthStart: Date): Promise<AdminOrderCounts> {
  await connectDB();
  const [ordersToday, ordersMonth, delivered, byStatus] = await Promise.all([
    OrderModel.countDocuments({ placedAt: $gte(dayStart) }),
    OrderModel.countDocuments({ placedAt: $gte(monthStart) }),
    OrderModel.aggregate<{ cents: number }>([
      { $match: { placedAt: $gte(monthStart) } },
      { $unwind: "$packages" },
      { $match: { "packages.status": "delivered" } },
      {
        $group: {
          _id: null,
          cents: { $sum: { $add: ["$packages.subtotalCents", "$packages.deliveryCents"] } },
        },
      },
    ]),
    OrderModel.aggregate<{ _id: PackageStatus; n: number }>([
      { $match: { status: $in(["pending", "in_progress", "shipped", "partially_delivered"]) } },
      { $unwind: "$packages" },
      { $group: { _id: "$packages.status", n: { $sum: 1 } } },
    ]),
  ]);
  const packages = Object.fromEntries(
    (
      [
        "pending",
        "confirmed",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ] as const
    ).map((s) => [s, 0]),
  ) as Record<PackageStatus, number>;
  for (const r of byStatus) packages[r._id] = r.n;
  return { ordersToday, ordersMonth, deliveredMonthCents: delivered[0]?.cents ?? 0, packages };
}
