import { z } from "zod";

export const MAX_CART_LINES = 50;
export const MAX_QTY = 10;

export const skuSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9-]+$/, "Invalid SKU");

export const cartItemSchema = z.object({
  sku: skuSchema,
  qty: z.number().int().min(1).max(MAX_QTY),
});

export const cartItemsSchema = z.array(cartItemSchema).max(MAX_CART_LINES);
