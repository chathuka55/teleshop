import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, intMin } from "./_shared";

/** No prices are ever stored in a cart (docs/08 §3.4). */
const cartSchema = new Schema(
  {
    /** null for guests */
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    /** from a signed cookie, guests only */
    guestId: { type: String, default: null },
    items: {
      type: [
        new Schema(
          {
            sku: { type: String, required: true, match: /^[A-Z0-9-]{2,64}$/ },
            qty: intMin(1, { required: true, max: 10 }),
            addedAt: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: (v: unknown[]) => v.length <= 50,
    },
  },
  baseOptions,
);
// Unique owners; partial so many null userId / guestId values are allowed.
cartSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });
cartSchema.index({ guestId: 1 }, { unique: true, partialFilterExpression: { guestId: { $type: "string" } } });
// Guest carts expire 30 days after their last update.
cartSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 30,
    partialFilterExpression: { guestId: { $type: "string" } },
    name: "guest_cart_ttl",
  },
);

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const CartModel =
  (models.Cart as Model<CartDoc> | undefined) ?? model<CartDoc>("Cart", cartSchema, "carts");
