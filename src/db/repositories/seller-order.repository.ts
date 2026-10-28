import { Types } from "mongoose";
import type { SellerPackageDTO, SellerPackageSummaryDTO } from "@/modules/fulfilment/types";
import type { PackageStatus, TimelineEntryDTO } from "@/modules/orders/types";
import { connectDB } from "../mongoose";
import { CategoryModel } from "../models/category.model";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { $in } from "../operators";

/**
 * Seller reads of orders (P6-T04). Every query is filtered by the seller's own id, and only the
 * seller's own package of each order is returned — never another shop's items or amounts.
 */

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);

type LeanItem = {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  name: string;
  variantLabel: string;
  imageUrl?: string | null;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  serialNumbers?: string[];
};

type LeanPackage = {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  status: PackageStatus;
  subtotalCents: number;
  deliveryCents: number;
  items: LeanItem[];
  shipment?: { courierName: string; trackingCode: string; trackingUrl: string; handedOverAt: Date } | null;
};

type LeanSellerOrder = {
  _id: Types.ObjectId;
  orderNo: string;
  placedAt: Date;
  deliveryMethod: "standard" | "express";
  deliveryAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    district: string;
    postalCode?: string | null;
  };
  packages: LeanPackage[];
};

/** Product ids whose category (or parent category) requires an IMEI/serial — phones, laptops. */
export async function serialRequiredProductIds(productIds: readonly string[]): Promise<Set<string>> {
  if (!productIds.length) return new Set();
  await connectDB();
  const products = await ProductModel.find({ _id: $in(productIds.filter(isId)) })
    .select("categoryId")
    .lean<{ _id: Types.ObjectId; categoryId: Types.ObjectId }[]>();
  const categories = await CategoryModel.find({ _id: $in(products.map((p) => p.categoryId)) })
    .select("requiresSerial parentId")
    .lean<{ _id: Types.ObjectId; requiresSerial?: boolean; parentId?: Types.ObjectId | null }[]>();
  const parents = await CategoryModel.find({
    _id: $in(categories.flatMap((c) => (c.parentId ? [c.parentId] : []))),
  })
    .select("requiresSerial")
    .lean<{ _id: Types.ObjectId; requiresSerial?: boolean }[]>();
  const parentNeeds = new Map(parents.map((c) => [c._id.toString(), !!c.requiresSerial]));
  const needs = new Map(
    categories.map((c) => [
      c._id.toString(),
      !!c.requiresSerial || (c.parentId ? (parentNeeds.get(c.parentId.toString()) ?? false) : false),
    ]),
  );
  return new Set(products.filter((p) => needs.get(p.categoryId.toString())).map((p) => p._id.toString()));
}

const ownPackage = (o: LeanSellerOrder, sellerId: string): LeanPackage | undefined =>
  o.packages.find((p) => p.sellerId.toString() === sellerId);

/** The shop's packages, newest first (summary rows for /seller/orders and the dashboard). */
export async function listSellerPackages(sellerId: string, limit = 300): Promise<SellerPackageSummaryDTO[]> {
  if (!isId(sellerId)) return [];
  await connectDB();
  const orders = await OrderModel.find({ "packages.sellerId": new Types.ObjectId(sellerId) })
    .sort({ placedAt: -1 })
    .limit(limit)
    .select("orderNo placedAt deliveryMethod deliveryAddress.city deliveryAddress.district packages")
    .lean<LeanSellerOrder[]>();
  const required = await serialRequiredProductIds([
    ...new Set(
      orders.flatMap((o) => ownPackage(o, sellerId)?.items.map((i) => i.productId.toString()) ?? []),
    ),
  ]);
  return orders.flatMap((o) => {
    const p = ownPackage(o, sellerId);
    if (!p) return [];
    return [
      {
        orderNo: o.orderNo,
        placedAt: o.placedAt.toISOString(),
        status: p.status,
        itemCount: p.items.reduce((n, i) => n + i.qty, 0),
        itemNames: p.items.map((i) => i.name),
        imageUrl: p.items.find((i) => i.imageUrl)?.imageUrl ?? null,
        amountCents: p.subtotalCents + p.deliveryCents,
        city: o.deliveryAddress.city,
        district: o.deliveryAddress.district,
        deliveryMethod: o.deliveryMethod,
        missingSerials: p.items.reduce(
          (n, i) =>
            n +
            (required.has(i.productId.toString()) ? Math.max(0, i.qty - (i.serialNumbers?.length ?? 0)) : 0),
          0,
        ),
      },
    ];
  });
}

/** The shop's own package of one order, with its history. Full address is masked by the service. */
export async function findSellerPackage(sellerId: string, orderNo: string): Promise<SellerPackageDTO | null> {
  if (!isId(sellerId)) return null;
  await connectDB();
  const o = await OrderModel.findOne({ orderNo, "packages.sellerId": new Types.ObjectId(sellerId) })
    .select("orderNo placedAt deliveryMethod deliveryAddress packages")
    .lean<LeanSellerOrder>();
  const p = o && ownPackage(o, sellerId);
  if (!o || !p) return null;

  const [required, events] = await Promise.all([
    serialRequiredProductIds(p.items.map((i) => i.productId.toString())),
    OrderEventModel.find({ orderId: o._id, packageId: $in([null, p._id]) })
      .sort({ createdAt: 1, _id: 1 })
      .select("toStatus note createdAt")
      .lean<{ toStatus: TimelineEntryDTO["status"]; note: string; createdAt: Date }[]>(),
  ]);
  const a = o.deliveryAddress;
  return {
    orderNo: o.orderNo,
    placedAt: o.placedAt.toISOString(),
    status: p.status,
    deliveryMethod: o.deliveryMethod,
    subtotalCents: p.subtotalCents,
    deliveryCents: p.deliveryCents,
    amountCents: p.subtotalCents + p.deliveryCents,
    address: {
      recipientName: a.recipientName,
      city: a.city,
      district: a.district,
      line1: a.line1,
      line2: a.line2 ?? "",
      postalCode: a.postalCode ?? null,
      phone: a.phone,
    },
    items: p.items.map((i) => ({
      id: i._id.toString(),
      sku: i.sku,
      name: i.name,
      variantLabel: i.variantLabel,
      imageUrl: i.imageUrl ?? null,
      qty: i.qty,
      unitPriceCents: i.unitPriceCents,
      lineTotalCents: i.lineTotalCents,
      requiresSerial: required.has(i.productId.toString()),
      serialNumbers: i.serialNumbers ?? [],
    })),
    shipment: p.shipment
      ? {
          courierName: p.shipment.courierName,
          trackingCode: p.shipment.trackingCode,
          trackingUrl: p.shipment.trackingUrl,
          handedOverAt: p.shipment.handedOverAt.toISOString(),
        }
      : null,
    timeline: events.map((e) => ({ at: e.createdAt.toISOString(), status: e.toStatus, note: e.note })),
    // A shop can cancel just its own package, so the reason lives on that package's event.
    cancelReason:
      p.status === "cancelled" ? (events.findLast((e) => e.toStatus === "cancelled")?.note ?? null) : null,
  };
}
