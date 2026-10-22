import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, intMin, ref } from "./_shared";

/**
 * One document per variant (docs/08 §3.3). Written ONLY by inventory.service inside
 * transactions. `available = onHand - reserved`, stored for atomic conditional `$inc`.
 * Migration 0002 adds a $jsonSchema validator as a second guard.
 */
const inventorySchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, match: /^[A-Z0-9-]{2,64}$/ },
    productId: ref("Product"),
    sellerId: ref("Seller"),
    onHand: intMin(0, { required: true, default: 0 }),
    reserved: intMin(0, { required: true, default: 0 }),
    available: intMin(0, { required: true, default: 0 }),
    lowStockAt: intMin(0, { default: 5 }),
    /** optimistic concurrency */
    version: intMin(0, { default: 0 }),
  },
  baseOptions,
);
inventorySchema.index({ sellerId: 1, available: 1 });
inventorySchema.index({ productId: 1 });

export type InventoryDoc = InferSchemaType<typeof inventorySchema>;
export const InventoryModel =
  (models.Inventory as Model<InventoryDoc> | undefined) ??
  model<InventoryDoc>("Inventory", inventorySchema, "inventory");
