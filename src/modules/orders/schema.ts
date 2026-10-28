import { z } from "zod";
import { objectId, orderNo, phoneLK } from "@/lib/validation/common";
import { cancelReasons, type CancelReason } from "./status";

export const trackOrderSchema = z.object({ orderNo, phone: phoneLK });
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

/** Checkout form. Prices are not part of it — the server computes every amount. */
export const placeOrderSchema = z.object({
  addressId: objectId,
  deliveryMethod: z.enum(["standard", "express"]),
  idempotencyKey: z.string().uuid("Reload the page and try again"),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const cancelOrderSchema = z.object({
  orderNo,
  reason: z.enum(Object.keys(cancelReasons) as [CancelReason, ...CancelReason[]], {
    error: "Choose a reason",
  }),
  note: z.string().trim().max(200, "Keep it under 200 characters").default(""),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
