import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { districts } from "@/config/districts";
import { baseOptions, cents, intMin, ref } from "./_shared";

export const packageStatuses = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export const orderStatuses = [
  "pending",
  "in_progress",
  "shipped",
  "delivered",
  "cancelled",
  "partially_delivered",
] as const;

/** Snapshot at purchase time — later product edits never change past orders. */
const itemSchema = new Schema({
  productId: ref("Product"),
  sku: { type: String, required: true },
  name: { type: String, required: true },
  variantLabel: { type: String, required: true },
  imageUrl: { type: String, default: null },
  unitPriceCents: cents(),
  qty: intMin(1, { required: true, max: 10 }),
  lineTotalCents: cents(),
  warrantyMonths: intMin(0, { default: 0 }),
  /** IMEI / serial per unit (≤ qty), recorded by the seller before ready_to_ship (P6-T04) */
  serialNumbers: {
    type: [{ type: String, maxlength: 30 }],
    default: [],
    validate: {
      validator(this: { qty?: number }, v: unknown[]) {
        return v.length <= (this.qty ?? 10);
      },
      message: "More serial numbers than units",
    },
  },
});

const shipmentSchema = new Schema(
  {
    courierId: ref("Courier"),
    courierName: { type: String, required: true },
    trackingCode: { type: String, required: true, maxlength: 40 },
    trackingUrl: { type: String, required: true },
    handedOverAt: { type: Date, required: true },
    estimatedDelivery: { type: Date, default: null },
    /** admin userId */
    addedBy: ref("User"),
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/** One package per seller. */
const packageSchema = new Schema({
  sellerId: ref("Seller"),
  status: { type: String, enum: packageStatuses, default: "pending", required: true },
  items: { type: [itemSchema], validate: (v: unknown[]) => v.length >= 1 },
  subtotalCents: cents(),
  deliveryCents: cents(),
  shipment: { type: shipmentSchema, default: null },
});

const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true, match: /^TS-\d{4}-\d{6}$/ },
    customerId: ref("User"),
    /** from the checkout form; stops double orders */
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 64 },
    deliveryAddress: {
      type: new Schema(
        {
          recipientName: { type: String, required: true },
          phone: { type: String, required: true, match: /^\+94\d{9}$/ },
          line1: { type: String, required: true },
          line2: { type: String, default: "" },
          city: { type: String, required: true },
          district: { type: String, enum: districts, required: true },
          postalCode: { type: String, default: null },
        },
        { _id: false },
      ),
      required: true,
    },
    deliveryMethod: { type: String, enum: ["standard", "express"], default: "standard" },
    subtotalCents: cents(),
    deliveryCents: cents(),
    discountCents: { ...cents(), default: 0 },
    totalCents: cents(),
    paymentMethod: { type: String, enum: ["cod"], default: "cod", required: true },
    /** derived from package statuses */
    status: { type: String, enum: orderStatuses, default: "pending", required: true },
    packages: { type: [packageSchema], validate: (v: unknown[]) => v.length >= 1 },
    placedAt: { type: Date, default: () => new Date() },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null, maxlength: 300 },
  },
  baseOptions,
);
orderSchema.index({ customerId: 1, placedAt: -1 });
orderSchema.index({ "packages.sellerId": 1, "packages.status": 1, placedAt: -1 });
orderSchema.index({ "packages.shipment.trackingCode": 1 }, { sparse: true });
orderSchema.index({ status: 1, placedAt: -1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const OrderModel =
  (models.Order as Model<OrderDoc> | undefined) ?? model<OrderDoc>("Order", orderSchema, "orders");
