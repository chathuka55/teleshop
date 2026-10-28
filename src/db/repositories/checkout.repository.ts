import { Types, type ClientSession } from "mongoose";
import { CounterModel } from "../models/counter.model";
import { InventoryModel } from "../models/inventory.model";
import { OrderEventModel } from "../models/order-event.model";
import { OrderModel } from "../models/order.model";
import { PaymentModel } from "../models/payment.model";
import { connectDB } from "../mongoose";
import { $gte, $in } from "../operators";

/**
 * Writes for placeOrder (docs/phases/phase-4 §placeOrder). Every function that changes data takes
 * the transaction session — they only run inside `withTransaction`.
 */

export class OutOfStockError extends Error {
  constructor(readonly sku: string) {
    super(`Out of stock: ${sku}`);
    this.name = "OutOfStockError";
  }
}

export type NewOrderItem = {
  productId: string;
  sku: string;
  name: string;
  variantLabel: string;
  imageUrl: string | null;
  unitPriceCents: number;
  qty: number;
  lineTotalCents: number;
  warrantyMonths: number;
};

export type NewOrderPackage = {
  sellerId: string;
  items: NewOrderItem[];
  subtotalCents: number;
  deliveryCents: number;
};

export type NewOrder = {
  customerId: string;
  idempotencyKey: string;
  deliveryAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    district: string;
    postalCode: string | null;
  };
  deliveryMethod: "standard" | "express";
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  packages: NewOrderPackage[];
};

/** Order already placed with this key by this customer (idempotent replay). */
export async function findOrderNoByIdempotencyKey(customerId: string, key: string): Promise<string | null> {
  await connectDB();
  const o = await OrderModel.findOne({ idempotencyKey: key, customerId })
    .select("orderNo")
    .lean<{ orderNo: string }>();
  return o?.orderNo ?? null;
}

/** Orders not delivered or cancelled yet — limits fake Cash on Delivery orders (docs/10 §1). */
export async function countOpenOrders(customerId: string): Promise<number> {
  await connectDB();
  return OrderModel.countDocuments({ customerId, status: $in(["pending", "in_progress", "shipped"]) });
}

/** TS-2026-000124 — atomic per-year counter, inside the transaction so a rollback skips no number. */
export async function nextOrderNo(session: ClientSession, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const c = await CounterModel.findOneAndUpdate(
    { _id: `order:${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  ).lean<{ seq: number }>();
  return `TS-${year}-${String(c?.seq ?? 1).padStart(6, "0")}`;
}

/**
 * Reserves stock with a conditional decrement: it only matches while `available >= qty`, so two
 * buyers can never both get the last unit (one write wins; the other matches nothing).
 */
export async function reserveStock(sku: string, qty: number, session: ClientSession): Promise<void> {
  const r = await InventoryModel.updateOne(
    { sku, available: $gte(qty) },
    { $inc: { available: -qty, reserved: qty, version: 1 } },
    { session },
  );
  if (r.modifiedCount !== 1) throw new OutOfStockError(sku);
}

/**
 * Undoes reserveStock when a package is cancelled. Guarded by `reserved >= qty` so a counter
 * that has drifted is never pushed below zero (the unit then simply stays unavailable).
 */
export async function releaseStock(sku: string, qty: number, session: ClientSession): Promise<boolean> {
  const r = await InventoryModel.updateOne(
    { sku, reserved: $gte(qty) },
    { $inc: { available: qty, reserved: -qty, version: 1 } },
    { session },
  );
  return r.modifiedCount === 1;
}

/** Delivered: the reserved units leave the shelf for good (reserved → sold). */
export async function commitSoldStock(sku: string, qty: number, session: ClientSession): Promise<boolean> {
  const r = await InventoryModel.updateOne(
    { sku, reserved: $gte(qty), onHand: $gte(qty) },
    { $inc: { reserved: -qty, onHand: -qty, version: 1 } },
    { session },
  );
  return r.modifiedCount === 1;
}

/** Inserts order + COD payment + first timeline event. Returns the order id. */
export async function insertOrder(
  order: NewOrder,
  orderNo: string,
  actor: { id: string; role: "customer" | "seller" | "admin" },
  session: ClientSession,
  now = new Date(),
): Promise<string> {
  const packages = order.packages.map((p) => ({
    _id: new Types.ObjectId(),
    sellerId: new Types.ObjectId(p.sellerId),
    status: "pending" as const,
    items: p.items.map((i) => ({ ...i, productId: new Types.ObjectId(i.productId) })),
    subtotalCents: p.subtotalCents,
    deliveryCents: p.deliveryCents,
  }));
  const [doc] = await OrderModel.create(
    [
      {
        orderNo,
        customerId: new Types.ObjectId(order.customerId),
        idempotencyKey: order.idempotencyKey,
        deliveryAddress: order.deliveryAddress,
        deliveryMethod: order.deliveryMethod,
        subtotalCents: order.subtotalCents,
        deliveryCents: order.deliveryCents,
        discountCents: 0,
        totalCents: order.totalCents,
        paymentMethod: "cod",
        status: "pending",
        packages,
        placedAt: now,
      },
    ],
    { session },
  );
  if (!doc) throw new Error("Order insert returned nothing");

  await PaymentModel.create(
    [
      {
        orderId: doc._id,
        method: "cod",
        status: "pending",
        amountCents: order.totalCents,
        perPackage: packages.map((p) => ({
          packageId: p._id,
          amountCents: p.subtotalCents + p.deliveryCents,
          status: "pending",
        })),
      },
    ],
    { session },
  );
  await OrderEventModel.create(
    [
      {
        orderId: doc._id,
        toStatus: "pending",
        actorId: new Types.ObjectId(actor.id),
        actorRole: actor.role,
        note: "Order placed — Cash on Delivery",
      },
    ],
    { session },
  );
  return doc._id.toString();
}
