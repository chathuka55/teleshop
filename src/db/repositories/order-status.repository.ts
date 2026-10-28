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
  placedAt: Date;
  updatedAt: Date;
  packages: {
    id: string;
    sellerId: string;
    status: PackageStatus;
    /** What the courier collects for this package. */
    amountCents: number;
    items: {
      id: string;
      productId: string;
      sku: string;
      name: string;
      qty: number;
      serialNumbers: string[];
    }[];
  }[];
};

type LeanForUpdate = {
  _id: Types.ObjectId;
  orderNo: string;
  customerId: Types.ObjectId;
  placedAt: Date;
  updatedAt: Date;
  packages: {
    _id: Types.ObjectId;
    sellerId: Types.ObjectId;
    status: PackageStatus;
    subtotalCents: number;
    deliveryCents: number;
    items: {
      _id: Types.ObjectId;
      productId: Types.ObjectId;
      sku: string;
      name: string;
      qty: number;
      serialNumbers?: string[];
    }[];
  }[];
};

export async function findOrderForUpdate(
  orderNo: string,
  session?: ClientSession,
): Promise<OrderForUpdate | null> {
  await connectDB();
  const o = await OrderModel.findOne({ orderNo })
    .select(
      "orderNo customerId placedAt updatedAt packages._id packages.sellerId packages.status packages.subtotalCents packages.deliveryCents packages.items._id packages.items.productId packages.items.sku packages.items.name packages.items.qty packages.items.serialNumbers",
    )
    .session(session ?? null)
    .lean<LeanForUpdate>();
  if (!o) return null;
  return {
    id: o._id.toString(),
    orderNo: o.orderNo,
    customerId: o.customerId.toString(),
    placedAt: o.placedAt,
    updatedAt: o.updatedAt,
    packages: o.packages.map((p) => ({
      id: p._id.toString(),
      sellerId: p.sellerId.toString(),
      status: p.status,
      amountCents: p.subtotalCents + p.deliveryCents,
      items: p.items.map((i) => ({
        id: i._id.toString(),
        productId: i.productId.toString(),
        sku: i.sku,
        name: i.name,
        qty: i.qty,
        serialNumbers: i.serialNumbers ?? [],
      })),
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
  /** Extra package fields to set with the status, e.g. `{ shipment }` when it ships. */
  packageFields?: ReadonlyMap<string, Record<string, unknown>>,
): Promise<void> {
  const set: Record<string, unknown> = { status: fields.status };
  if (fields.cancelledAt !== undefined) set.cancelledAt = fields.cancelledAt;
  if (fields.cancelReason !== undefined) set.cancelReason = fields.cancelReason;
  order.packages.forEach((p, i) => {
    const next = changes.get(p.id);
    if (next) set[`packages.${i}.status`] = next;
    for (const [k, v] of Object.entries(packageFields?.get(p.id) ?? {})) set[`packages.${i}.${k}`] = v;
  });
  const r = await OrderModel.updateOne(
    { _id: new Types.ObjectId(order.id), updatedAt: order.updatedAt },
    { $set: set },
    { session },
  );
  if (r.modifiedCount !== 1) throw new OrderChangedError(order.orderNo);
}

/** Stores the IMEIs/serials of one item, only if the order is unchanged since it was read. */
export async function setItemSerials(
  order: OrderForUpdate,
  packageId: string,
  itemId: string,
  serialNumbers: readonly string[],
  session?: ClientSession,
): Promise<void> {
  const pi = order.packages.findIndex((p) => p.id === packageId);
  const ii = pi < 0 ? -1 : (order.packages[pi]?.items.findIndex((i) => i.id === itemId) ?? -1);
  if (ii < 0) throw new OrderChangedError(order.orderNo);
  const r = await OrderModel.updateOne(
    { _id: new Types.ObjectId(order.id), updatedAt: order.updatedAt },
    { $set: { [`packages.${pi}.items.${ii}.serialNumbers`]: [...serialNumbers] } },
    { session, runValidators: true },
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

/** The order + package that already carries this tracking code (codes are unique per courier). */
export async function findTrackingCodeUse(courierName: string, trackingCode: string): Promise<string | null> {
  await connectDB();
  const o = await OrderModel.findOne({
    "packages.shipment.trackingCode": trackingCode,
    "packages.shipment.courierName": courierName,
  })
    .select("orderNo")
    .lean<{ orderNo: string }>();
  return o?.orderNo ?? null;
}
