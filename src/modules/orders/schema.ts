import { z } from "zod";
import { objectId, orderNo, phoneLK } from "@/lib/validation/common";

export const trackOrderSchema = z.object({ orderNo, phone: phoneLK });
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

/** Checkout form. Prices are not part of it — the server computes every amount. */
export const placeOrderSchema = z.object({
  addressId: objectId,
  deliveryMethod: z.enum(["standard", "express"]),
  idempotencyKey: z.string().uuid("Reload the page and try again"),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
