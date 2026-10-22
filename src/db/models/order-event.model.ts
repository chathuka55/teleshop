import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { orderStatuses, packageStatuses } from "./order.model";
import { ref } from "./_shared";

const statuses = [...new Set([...packageStatuses, ...orderStatuses])];

/** Append-only status history — powers the tracking timeline (docs/08 §3.4). */
const orderEventSchema = new Schema(
  {
    orderId: ref("Order"),
    packageId: { type: Schema.Types.ObjectId, default: null },
    fromStatus: { type: String, enum: [...statuses, null], default: null },
    toStatus: { type: String, enum: statuses, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, enum: ["customer", "seller", "admin", "system"], required: true },
    note: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: "throw" },
);
orderEventSchema.index({ orderId: 1, createdAt: 1 });

export type OrderEventDoc = InferSchemaType<typeof orderEventSchema>;
export const OrderEventModel =
  (models.OrderEvent as Model<OrderEventDoc> | undefined) ??
  model<OrderEventDoc>("OrderEvent", orderEventSchema, "order_events");
