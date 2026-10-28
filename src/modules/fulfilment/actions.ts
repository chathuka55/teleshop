"use server";

import { revalidatePath } from "next/cache";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { invalid, type FormState } from "@/lib/validation/form";
import { recordSerialsSchema, sellerStepSchema } from "./schema";
import { recordSerials, sellerStep } from "./seller";

/* Fulfilment Server Actions (P6-T04): parse (Zod) → rate limit 30/min (doc 09) → service. */

async function limited(): Promise<{ ip: string | null; blocked: FormState | null }> {
  const ip = await clientIp();
  const r = await rateLimit(`fulfil:${ip ?? "unknown"}`, { limit: 30, windowMs: 60_000 });
  return {
    ip,
    blocked: r.ok
      ? null
      : { status: "error", message: `Too many changes. Try again in ${r.retryAfterSeconds} seconds.` },
  };
}

function revalidate(orderNo: string): void {
  revalidatePath(`/seller/orders/${orderNo}`);
  revalidatePath("/seller/orders");
  revalidatePath("/seller");
}

/** Accept, start packing, mark ready to ship, or cancel (with a reason) the shop's package. */
export async function packageStepAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sellerStepSchema.safeParse({
    orderNo: formData.get("orderNo"),
    step: formData.get("step"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await sellerStep(parsed.data, ip);
  if (!r.ok) return { status: "error", message: r.message };
  revalidate(parsed.data.orderNo);
  return { status: "ok", message: r.message };
}

/** IMEI / serial per unit of one order line. */
export async function recordSerialAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const serials = formData
    .getAll("serial")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const parsed = recordSerialsSchema.safeParse({
    orderNo: formData.get("orderNo"),
    itemId: formData.get("itemId"),
    serials,
  });
  if (!parsed.success) return invalid(parsed.error, { serials: serials.join("\n") });
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await recordSerials(parsed.data, ip);
  if (!r.ok) return { status: "error", message: r.message, values: { serials: serials.join("\n") } };
  revalidate(parsed.data.orderNo);
  return { status: "ok", message: r.message };
}
