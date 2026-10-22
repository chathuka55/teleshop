import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, ref } from "./_shared";

const wishlistSchema = new Schema(
  {
    userId: { ...ref("User"), unique: true },
    productIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
      validate: (v: unknown[]) => v.length <= 200,
    },
  },
  baseOptions,
);

export type WishlistDoc = InferSchemaType<typeof wishlistSchema>;
export const WishlistModel =
  (models.Wishlist as Model<WishlistDoc> | undefined) ??
  model<WishlistDoc>("Wishlist", wishlistSchema, "wishlists");
