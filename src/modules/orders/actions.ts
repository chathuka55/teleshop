"use server";

import { revalidatePath } from "next/cache";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { cancelOrderSchema, placeOrderSchema, trackOrderSchema } from "./schema";
import { cancelMyOrder, placeOrder } from "./customer";
import { trackOrder } from "./service";
import type { PlaceOrderResult, TrackResultDTO } from "./types";

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

  const ip = (await clientIp()) ?? "unknown";
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

/** Checkout "Place order". parse (Zod) → rate limit → service (prices + stock from the DB only). */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "ADDRESS_NOT_FOUND",
      message: "Choose a delivery address and delivery method.",
    };
  }
  const ip = await clientIp();
  const r = await rateLimit(`checkout:${ip ?? "unknown"}`, { limit: 10, windowMs: 60_000 });
  if (!r.ok)
    return {
      ok: false,
      code: "CART_CHANGED",
      message: `Too many attempts. Try again in ${r.retryAfterSeconds} seconds.`,
    };
  const result = await placeOrder(parsed.data, ip);
  if (result.ok) revalidatePath("/account/orders");
  return result;
}

/** "Cancel order" on the order page. parse → rate limit 5/min (doc 09) → service (owner, before shipped). */
export async function cancelOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = cancelOrderSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));

  const ip = await clientIp();
  const limit = await rateLimit(`cancel:${ip ?? "unknown"}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const r = await cancelMyOrder(parsed.data, ip);
  if (!r.ok) return { status: "error", message: r.message };
  revalidatePath(`/account/orders/${parsed.data.orderNo}`);
  revalidatePath("/account/orders");
  return { status: "ok", message: "Your order is cancelled." };
}
