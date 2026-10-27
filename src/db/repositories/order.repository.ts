import type { Types } from "mongoose";
import type {
  CustomerOrderDTO,
  CustomerOrderSummaryDTO,
  PackageStatus,
  TrackResultDTO,
} from "@/modules/orders/types";
import { connectDB } from "../mongoose";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
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

type LeanCustomerOrder = {
  orderNo: string;
  placedAt: Date;
  status: CustomerOrderDTO["status"];
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
    items: CustomerOrderDTO["packages"][number]["items"];
  }[];
};

export async function findCustomerOrder(
  customerId: string,
  orderNo: string,
): Promise<CustomerOrderDTO | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo, customerId }).lean<LeanCustomerOrder>();
  if (!o) return null;
  const sellers = await findLeanSellers({ ids: o.packages.map((p) => p.sellerId) });
  const byId = new Map(sellers.map((s) => [s._id.toString(), s]));
  return {
    orderNo: o.orderNo,
    placedAt: o.placedAt.toISOString(),
    status: o.status,
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
      return {
        id: p._id.toString(),
        sellerName: seller?.shopName ?? "Teleshop seller",
        sellerSlug: seller?.slug ?? "",
        status: p.status,
        subtotalCents: p.subtotalCents,
        deliveryCents: p.deliveryCents,
        items: p.items.map((i) => ({
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

export async function listCustomerOrders(customerId: string, limit = 50): Promise<CustomerOrderSummaryDTO[]> {
  await connectDB();
  const rows = await OrderModel.find({ customerId })
    .sort({ placedAt: -1 })
    .limit(limit)
    .select("orderNo placedAt status totalCents packages.items.qty")
    .lean<
      {
        orderNo: string;
        placedAt: Date;
        status: CustomerOrderSummaryDTO["status"];
        totalCents: number;
        packages: { items: { qty: number }[] }[];
      }[]
    >();
  return rows.map((o) => ({
    orderNo: o.orderNo,
    placedAt: o.placedAt.toISOString(),
    status: o.status,
    totalCents: o.totalCents,
    itemCount: o.packages.reduce((n, p) => n + p.items.reduce((m, i) => m + i.qty, 0), 0),
    packageCount: o.packages.length,
  }));
}
