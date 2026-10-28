import type { Types } from "mongoose";
import type {
  CustomerOrderDTO,
  CustomerOrderSummaryDTO,
  PackageStatus,
  ShipmentDTO,
  TimelineEntryDTO,
  TrackResultDTO,
} from "@/modules/orders/types";
import { connectDB } from "../mongoose";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { ReviewModel } from "../models/review.model";
import { $in } from "../operators";
import { findLeanSellers } from "./seller.repository";

type LeanOrderForTracking = {
  _id: Types.ObjectId;
  orderNo: string;
  placedAt: Date;
  deliveryAddress: { phone: string };
  packages: {
    _id: Types.ObjectId;
    sellerId: Types.ObjectId;
    status: PackageStatus;
    items: { qty: number }[];
    shipment?: { courierName: string; trackingCode: string; trackingUrl: string; handedOverAt: Date } | null;
  }[];
};

/**
 * Public tracking lookup. Returns the phone ONLY so the service can compare it — the service
 * must never pass it on. The DTO carries no address, prices or customer details.
 */
export async function findOrderForTracking(
  orderNo: string,
): Promise<{ phone: string; result: TrackResultDTO } | null> {
  await connectDB();
  const order = await OrderModel.findOne({ orderNo })
    .select(
      "orderNo placedAt deliveryAddress.phone packages._id packages.sellerId packages.status packages.items.qty packages.shipment",
    )
    .lean<LeanOrderForTracking>();
  if (!order) return null;

  const [sellers, lastEvent] = await Promise.all([
    findLeanSellers({ ids: order.packages.map((p) => p.sellerId) }),
    OrderEventModel.findOne({ orderId: order._id })
      .sort({ createdAt: -1 })
      .select("createdAt note toStatus")
      .lean<{ createdAt: Date; note: string; toStatus: string }>(),
  ]);
  const sellerName = new Map(sellers.map((s) => [s._id.toString(), s.shopName]));

  return {
    phone: order.deliveryAddress.phone,
    result: {
      orderNo: order.orderNo,
      lastUpdate: {
        at: (lastEvent?.createdAt ?? order.placedAt).toISOString(),
        note: lastEvent?.note || `Status: ${(lastEvent?.toStatus ?? "pending").replace(/_/g, " ")}`,
      },
      packages: order.packages.map((p) => ({
        id: p._id.toString(),
        sellerName: sellerName.get(p.sellerId.toString()) ?? "Teleshop seller",
        status: p.status,
        itemCount: p.items.reduce((n, i) => n + i.qty, 0),
        shipment: p.shipment
          ? {
              courierName: p.shipment.courierName,
              trackingCode: p.shipment.trackingCode,
              trackingUrl: p.shipment.trackingUrl,
              handedOverAt: p.shipment.handedOverAt.toISOString(),
            }
          : null,
      })),
    },
  };
}

// ---- Customer reads (confirmation page, /account/orders) — always scoped to the customer ----

type LeanShipment = { courierName: string; trackingCode: string; trackingUrl: string; handedOverAt: Date };

const toShipment = (s: LeanShipment | null | undefined): ShipmentDTO | null =>
  s
    ? {
        courierName: s.courierName,
        trackingCode: s.trackingCode,
        trackingUrl: s.trackingUrl,
        handedOverAt: s.handedOverAt.toISOString(),
      }
    : null;

type LeanCustomerOrder = {
  _id: Types.ObjectId;
  orderNo: string;
  placedAt: Date;
  status: CustomerOrderDTO["status"];
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  deliveryMethod: CustomerOrderDTO["deliveryMethod"];
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  deliveryAddress: CustomerOrderDTO["deliveryAddress"];
  packages: {
    _id: Types.ObjectId;
    sellerId: Types.ObjectId;
    status: PackageStatus;
    subtotalCents: number;
    deliveryCents: number;
    shipment?: LeanShipment | null;
    items: (Omit<
      CustomerOrderDTO["packages"][number]["items"][number],
      "id" | "productSlug" | "myRating" | "canReview"
    > & {
      _id: Types.ObjectId;
      productId: Types.ObjectId;
    })[];
  }[];
};

type LeanEvent = {
  packageId: Types.ObjectId | null;
  toStatus: TimelineEntryDTO["status"];
  note: string;
  createdAt: Date;
};

/**
 * The customer's own order with each package's timeline, shipment and the customer's ratings.
 * `canCancel` / `canReview` are business rules — left false here and set by the orders service.
 */
export async function findCustomerOrder(
  customerId: string,
  orderNo: string,
): Promise<CustomerOrderDTO | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo, customerId }).lean<LeanCustomerOrder>();
  if (!o) return null;
  const productIds = o.packages.flatMap((p) => p.items.map((i) => i.productId));
  const [sellers, events, reviews, products] = await Promise.all([
    findLeanSellers({ ids: o.packages.map((p) => p.sellerId) }),
    OrderEventModel.find({ orderId: o._id })
      .sort({ createdAt: 1, _id: 1 })
      .select("packageId toStatus note createdAt")
      .lean<LeanEvent[]>(),
    ReviewModel.find({ orderId: o._id, customerId })
      .select("itemId rating")
      .lean<{ itemId: Types.ObjectId; rating: number }[]>(),
    ProductModel.find({ _id: $in(productIds) })
      .select("slug")
      .lean<{ _id: Types.ObjectId; slug: string }[]>(),
  ]);
  const byId = new Map(sellers.map((s) => [s._id.toString(), s]));
  const ratingByItem = new Map(reviews.map((r) => [r.itemId.toString(), r.rating]));
  const slugById = new Map(products.map((p) => [p._id.toString(), p.slug]));

  return {
    orderNo: o.orderNo,
    placedAt: o.placedAt.toISOString(),
    status: o.status,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    cancelReason: o.cancelReason ?? null,
    canCancel: false,
    deliveryMethod: o.deliveryMethod,
    paymentMethod: "cod",
    subtotalCents: o.subtotalCents,
    deliveryCents: o.deliveryCents,
    totalCents: o.totalCents,
    deliveryAddress: {
      recipientName: o.deliveryAddress.recipientName,
      phone: o.deliveryAddress.phone,
      line1: o.deliveryAddress.line1,
      line2: o.deliveryAddress.line2 ?? "",
      city: o.deliveryAddress.city,
      district: o.deliveryAddress.district,
      postalCode: o.deliveryAddress.postalCode ?? null,
    },
    packages: o.packages.map((p) => {
      const seller = byId.get(p.sellerId.toString());
      const pid = p._id.toString();
      return {
        id: pid,
        sellerName: seller?.shopName ?? "Teleshop seller",
        sellerSlug: seller?.slug ?? "",
        status: p.status,
        subtotalCents: p.subtotalCents,
        deliveryCents: p.deliveryCents,
        shipment: toShipment(p.shipment),
        // Order-wide events (packageId null, e.g. "placed") belong to every package's history.
        timeline: events
          .filter((e) => !e.packageId || e.packageId.toString() === pid)
          .map((e) => ({ at: e.createdAt.toISOString(), status: e.toStatus, note: e.note })),
        items: p.items.map((i) => ({
          id: i._id.toString(),
          productSlug: slugById.get(i.productId.toString()) ?? "",
          myRating: ratingByItem.get(i._id.toString()) ?? null,
          canReview: false,
          sku: i.sku,
          name: i.name,
          variantLabel: i.variantLabel,
          imageUrl: i.imageUrl ?? null,
          qty: i.qty,
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents,
        })),
      };
    }),
  };
}

export async function listCustomerOrders(
  customerId: string,
  limit = 200,
): Promise<CustomerOrderSummaryDTO[]> {
  await connectDB();
  const rows = await OrderModel.find({ customerId })
    .sort({ placedAt: -1 })
    .limit(limit)
    .select(
      "orderNo placedAt status totalCents packages.items.qty packages.items.name packages.items.imageUrl",
    )
    .lean<
      {
        orderNo: string;
        placedAt: Date;
        status: CustomerOrderSummaryDTO["status"];
        totalCents: number;
        packages: { items: { qty: number; name: string; imageUrl?: string | null }[] }[];
      }[]
    >();
  return rows.map((o) => {
    const items = o.packages.flatMap((p) => p.items);
    return {
      orderNo: o.orderNo,
      placedAt: o.placedAt.toISOString(),
      status: o.status,
      totalCents: o.totalCents,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      packageCount: o.packages.length,
      itemNames: items.map((i) => i.name),
      imageUrl: items.find((i) => i.imageUrl)?.imageUrl ?? null,
    };
  });
}
