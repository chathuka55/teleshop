import type { Types } from "mongoose";
import type { PackageStatus, TrackResultDTO } from "@/modules/orders/types";
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
