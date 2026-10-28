import { z } from "zod";
import { objectId, orderNo } from "@/lib/validation/common";

export const addTrackingCodeSchema = z.object({
  orderNo,
  packageId: objectId,
  courierId: z.string().regex(/^[a-f\d]{24}$/i, "Choose the courier"),
  trackingCode: z.string().trim().min(4, "Enter the tracking code").max(40),
  /** datetime-local from the form, read as Sri Lanka time. */
  handedOverAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter when the courier took the package")
    .transform((v) => new Date(`${v}:00+05:30`)),
  notify: z.boolean().default(true),
});
export type AddTrackingCodeInput = z.infer<typeof addTrackingCodeSchema>;

export const packageRefSchema = z.object({ orderNo, packageId: objectId });

export const adminPackageStepSchema = packageRefSchema.extend({
  step: z.enum(["deliver", "return", "cancel"]),
  note: z.string().trim().max(200).default(""),
});
export type AdminPackageStepInput = z.infer<typeof adminPackageStepSchema>;

export const adminOrderListSchema = z.object({
  status: z
    .enum(["pending", "in_progress", "shipped", "partially_delivered", "delivered", "cancelled"])
    .optional(),
  q: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
