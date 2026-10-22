import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, cents, intMin, ref } from "./_shared";

const payoutSchema = new Schema(
  {
    sellerId: ref("Seller"),
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    orderCount: intMin(0, { default: 0 }),
    grossCents: cents(),
    feeCents: cents(),
    netCents: cents(),
    status: { type: String, enum: ["scheduled", "paid"], default: "scheduled" },
    paidAt: { type: Date, default: null },
    reference: { type: String, default: null, maxlength: 80 },
  },
  baseOptions,
);
payoutSchema.index({ sellerId: 1, periodStart: 1 }, { unique: true });

export type PayoutDoc = InferSchemaType<typeof payoutSchema>;
export const PayoutModel =
  (models.Payout as Model<PayoutDoc> | undefined) ?? model<PayoutDoc>("Payout", payoutSchema, "payouts");
