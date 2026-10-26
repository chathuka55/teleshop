import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { districts } from "@/config/districts";
import { baseOptions, intMin, ratingCache, ref } from "./_shared";

const sellerSchema = new Schema(
  {
    /** shop owner */
    userId: { ...ref("User"), unique: true },
    shopName: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{2,80}$/ },
    shopType: {
      type: String,
      enum: ["mobile_shop", "computer_shop", "accessories_shop", "general_tech"],
      required: true,
    },
    businessRegNo: { type: String, required: true, trim: true, maxlength: 30 },
    address: {
      type: new Schema(
        {
          line1: { type: String, required: true, maxlength: 120 },
          city: { type: String, required: true, maxlength: 60 },
          district: { type: String, enum: districts, required: true },
          postalCode: { type: String, default: null, maxlength: 10 },
        },
        { _id: false },
      ),
      required: true,
    },
    phone: { type: String, required: true, match: /^\+94\d{9}$/ },
    description: { type: String, default: "", maxlength: 1000 },
    logoUrl: { type: String, default: null },
    /** Wide shop photo for the top of the shop page (added v0.3). */
    coverUrl: { type: String, default: null },
    /** Up to 6 shop photos (storefront, interior) — shop page gallery (added v0.3). */
    photos: {
      type: [
        new Schema(
          {
            url: { type: String, required: true },
            alt: { type: String, default: "", maxlength: 160 },
            width: intMin(1),
            height: intMin(1),
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: (v: unknown[]) => v.length <= 6,
    },
    /** Map pin (WGS84). Shown on the shop page with a "Get directions" link (added v0.3). */
    location: {
      type: new Schema(
        {
          lat: { type: Number, required: true, min: -90, max: 90 },
          lng: { type: Number, required: true, min: -180, max: 180 },
        },
        { _id: false },
      ),
      default: null,
    },
    /** Free text, e.g. "Mon–Sat 9.00–19.00 · Sun 10.00–14.00" (added v0.3). */
    openingHours: { type: String, default: "", maxlength: 80 },
    /** Year the shop was founded (shown as "Since 2019"). */
    establishedYear: intMin(1950, { max: 2100 }),
    /** Up to 5 short display tags ("Phones", "Apple"…). */
    tags: { type: [{ type: String, maxlength: 24 }], default: [], validate: (v: string[]) => v.length <= 5 },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
    },
    rejectionReason: { type: String, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    settings: {
      type: new Schema(
        {
          acceptsCod: { type: Boolean, default: true },
          vacationMode: { type: Boolean, default: false },
          autoAccept: { type: Boolean, default: false },
          dispatchDays: intMin(0, { default: 2, max: 14 }),
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    /** Full account number is NOT stored here (docs/08 §3.3). */
    payoutAccount: {
      type: new Schema(
        { bank: String, branch: String, last4: { type: String, match: /^\d{4}$/ } },
        { _id: false },
      ),
      default: null,
    },
    rating: { type: ratingCache, default: () => ({}) },
  },
  baseOptions,
);
sellerSchema.index({ approvalStatus: 1 });

export type SellerDoc = InferSchemaType<typeof sellerSchema>;
export const SellerModel =
  (models.Seller as Model<SellerDoc> | undefined) ?? model<SellerDoc>("Seller", sellerSchema, "sellers");
