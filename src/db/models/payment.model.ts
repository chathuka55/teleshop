import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, cents, ref } from "./_shared";

const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;

/** Never stores card data — COD only in v1. */
const paymentSchema = new Schema(
  {
    orderId: { ...ref("Order"), unique: true },
    method: { type: String, enum: ["cod"], default: "cod", required: true },
    status: { type: String, enum: paymentStatuses, default: "pending", required: true },
    amountCents: cents(),
    perPackage: {
      type: [
        new Schema(
          {
            packageId: { type: Schema.Types.ObjectId, required: true },
            amountCents: cents(),
            status: { type: String, enum: paymentStatuses, default: "pending" },
            collectedAt: { type: Date, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    reference: { type: String, default: null, maxlength: 80 },
    paidAt: { type: Date, default: null },
  },
  baseOptions,
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const PaymentModel =
  (models.Payment as Model<PaymentDoc> | undefined) ??
  model<PaymentDoc>("Payment", paymentSchema, "payments");
