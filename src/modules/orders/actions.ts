"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/security/rate-limit";
import { trackOrderSchema } from "./schema";
import { trackOrder } from "./service";
import type { TrackResultDTO } from "./types";

type TrackValues = { orderNo: string; phone: string };

export type TrackState =
  | { status: "idle" }
  | { status: "found"; result: TrackResultDTO; values: TrackValues }
  | { status: "error"; message: string; fields?: { orderNo?: string; phone?: string }; values: TrackValues };

/** parse → rate limit 10/min/IP (doc 09) → service. Same message for unknown order / wrong phone. */
export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const raw = { orderNo: formData.get("orderNo"), phone: formData.get("phone") };
  // Echoed back so the inputs keep their text after React resets the form.
  const values: TrackValues = {
    orderNo: typeof raw.orderNo === "string" ? raw.orderNo.slice(0, 30) : "",
    phone: typeof raw.phone === "string" ? raw.phone.slice(0, 20) : "",
  };
  const parsed = trackOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: { orderNo?: string; phone?: string } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "orderNo" || key === "phone") && !fields[key]) fields[key] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fields, values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimit(`track:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many lookups. Try again in ${limit.retryAfterSeconds} seconds.`,
      values,
    };
  }

  const result = await trackOrder(parsed.data);
  if (!result) {
    return {
      status: "error",
      message: "We couldn’t find an order with that number and phone. Check both and try again.",
      values,
    };
  }
  return { status: "found", result, values };
}
