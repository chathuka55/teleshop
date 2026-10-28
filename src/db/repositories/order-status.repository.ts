import { Types, type ClientSession } from "mongoose";
import type { OrderStatus, PackageStatus } from "@/modules/orders/types";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
import { connectDB } from "../mongoose";

/**
 * Status changes on existing orders (cancel now; seller fulfilment and shipping later). Writes
 * take the transaction session — callers run them inside `withTransaction`.
 */

/** The order changed between reading and writing it (another tab, the shop, an admin). */
export class OrderChangedError extends Error {
  constructor(readonly orderNo: string) {
    super(`Order changed meanwhile: ${orderNo}`);
    this.name = "OrderChangedError";
  }
}

export type OrderForUpdate = {
  id: string;
  orderNo: string;
  customerId: string;
  updatedAt: Date;
  packages: {
    id: string;
    sellerId: string;
    status: PackageStatus;
    items: { sku: string; name: string; qty: number }[];
  }[];
};

type LeanForUpdate = {
  _id: Types.ObjectId;
  orderNo: string;
  customerId: Types.ObjectId;
  updatedAt: Date;
  packages: {
    _id: Types.ObjectId;
    sellerId: Types.ObjectId;
    status: PackageStatus;
    items: { sku: string; name: string; qty: number }[];
  }[];
};

export async function findOrderForUpdate(
  orderNo: string,
  session?: ClientSession,
): Promise<OrderForUpdate | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo })
    .select(
      "orderNo customerId updatedAt packages._id packages.sellerId packages.status packages.items.sku packages.items.name packages.items.qty",
    )
    .session(session ?? null)
    .lean<LeanForUpdate>();
  if (!o) return null;
  return {
    id: o._id.toString(),
    orderNo: o.orderNo,
    customerId: o.customerId.toString(),
    updatedAt: o.updatedAt,
    packages: o.packages.map((p) => ({
      id: p._id.toString(),
      sellerId: p.sellerId.toString(),
      status: p.status,
      items: p.items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty })),
    })),
  };
}

/**
 * Sets the new package statuses and the order fields — only if the order is exactly as it was
 * read (`updatedAt` matches), so a status the shop set meanwhile is never overwritten.
 */
export async function updatePackageStatuses(
  order: OrderForUpdate,
  changes: ReadonlyMap<string, PackageStatus>,
  fields: { status: OrderStatus; cancelledAt?: Date | null; cancelReason?: string | null },
  session: ClientSession,
): Promise<void> {
  const set: Record<string, unknown> = { status: fields.status };
  if (fields.cancelledAt !== undefined) set.cancelledAt = fields.cancelledAt;
  if (fields.cancelReason !== undefined) set.cancelReason = fields.cancelReason;
  order.packages.forEach((p, i) => {
    const next = changes.get(p.id);
    if (next) set[`packages.${i}.status`] = next;
  });
  const r = await OrderModel.updateOne(
    { _id: new Types.ObjectId(order.id), updatedAt: order.updatedAt },
    { $set: set },
    { session },
  );
  if (r.modifiedCount !== 1) throw new OrderChangedError(order.orderNo);
}

export type NewOrderEvent = {
  packageId: string | null;
  fromStatus: PackageStatus | OrderStatus | null;
  toStatus: PackageStatus | OrderStatus;
  actorId: string | null;
  actorRole: "customer" | "seller" | "admin" | "system";
  note: string;
};

/** Appends timeline entries (order_events is insert-only). */
export async function insertOrderEvents(
  orderId: string,
  events: readonly NewOrderEvent[],
  session: ClientSession,
): Promise<void> {
  if (!events.length) return;
  await OrderEventModel.create(
    events.map((e) => ({
      orderId: new Types.ObjectId(orderId),
      packageId: e.packageId ? new Types.ObjectId(e.packageId) : null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorId: e.actorId ? new Types.ObjectId(e.actorId) : null,
      actorRole: e.actorRole,
      note: e.note.slice(0, 300),
    })),
    { session, ordered: true },
  );
}
