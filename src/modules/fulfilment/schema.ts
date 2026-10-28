import { z } from "zod";
import { objectId, orderNo } from "@/lib/validation/common";
import { serialNumber } from "@/lib/validation/serial";

export const sellerCancelReasons = {
  out_of_stock: "The item is out of stock",
  price_error: "The price was listed wrong",
  cannot_deliver: "We can't deliver to this area",
  other: "Another reason",
} as const;
export type SellerCancelReason = keyof typeof sellerCancelReasons;

const reasonKeys = Object.keys(sellerCancelReasons) as [SellerCancelReason, ...SellerCancelReason[]];

export const sellerStepSchema = z
  .object({
    orderNo,
    step: z.enum(["accept", "pack", "ready", "cancel"]),
    reason: z.enum(reasonKeys, { error: "Choose a reason" }).optional(),
  })
  .refine((d) => d.step !== "cancel" || !!d.reason, { path: ["reason"], message: "Choose a reason" });
export type SellerStepInput = z.infer<typeof sellerStepSchema>;

/** One IMEI/serial per unit; the form posts one `serial` field per unit (blanks dropped). */
export const recordSerialsSchema = z
  .object({
    orderNo,
    itemId: objectId,
    serials: z.array(serialNumber).min(1, "Enter the IMEI or serial number").max(10),
  })
  .refine((d) => new Set(d.serials).size === d.serials.length, {
    path: ["serials"],
    message: "Each unit needs a different number",
  });
export type RecordSerialsInput = z.infer<typeof recordSerialsSchema>;
