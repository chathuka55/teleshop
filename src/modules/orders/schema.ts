import { z } from "zod";
import { orderNo, phoneLK } from "@/lib/validation/common";

export const trackOrderSchema = z.object({ orderNo, phone: phoneLK });
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
