import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { districts } from "@/config/districts";
import { baseOptions, ref } from "./_shared";

/** Max 10 per user — enforced in users.service. Owner-only writes. */
const addressSchema = new Schema(
  {
    userId: ref("User"),
    label: { type: String, enum: ["home", "office", "other"], default: "home" },
    recipientName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, match: /^\+94\d{9}$/ },
    line1: { type: String, required: true, maxlength: 120 },
    line2: { type: String, default: "", maxlength: 120 },
    city: { type: String, required: true, maxlength: 60 },
    district: { type: String, enum: districts, required: true },
    postalCode: { type: String, default: null, maxlength: 10 },
    isDefault: { type: Boolean, default: false },
  },
  baseOptions,
);
addressSchema.index({ userId: 1 });

export type AddressDoc = InferSchemaType<typeof addressSchema>;
export const AddressModel =
  (models.Address as Model<AddressDoc> | undefined) ??
  model<AddressDoc>("Address", addressSchema, "addresses");
