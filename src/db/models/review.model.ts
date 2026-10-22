import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, intMin, ref } from "./_shared";

/** Verified purchase only: unique per (orderId, itemId). Plain text, no HTML. */
const reviewSchema = new Schema(
  {
    productId: ref("Product"),
    sellerId: ref("Seller"),
    customerId: ref("User"),
    orderId: ref("Order"),
    itemId: { type: Schema.Types.ObjectId, required: true },
    rating: intMin(1, { required: true, max: 5 }),
    title: { type: String, default: "", maxlength: 100 },
    comment: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["visible", "hidden", "flagged"], default: "visible" },
    sellerReply: { type: String, default: null, maxlength: 1000 },
  },
  baseOptions,
);
reviewSchema.index({ orderId: 1, itemId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const ReviewModel =
  (models.Review as Model<ReviewDoc> | undefined) ?? model<ReviewDoc>("Review", reviewSchema, "reviews");
