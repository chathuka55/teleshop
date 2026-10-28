"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { objectId } from "@/lib/validation/common";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { addTrackingCodeSchema, adminPackageStepSchema } from "@/modules/orders/admin-schema";
import { adminAddTrackingCode, adminDecideSeller, adminModerateProduct, adminPackageStep } from "./session";

/* Admin Server Actions (P7): parse (Zod) → rate limit 60/min (doc 09) → service (admin + TOTP). */

async function limited(): Promise<{ ip: string | null; blocked: FormState | null }> {
  const ip = await clientIp();
  const r = await rateLimit(`admin:${ip ?? "unknown"}`, { limit: 60, windowMs: 60_000 });
  return {
    ip,
    blocked: r.ok ? null : { status: "error", message: `Slow down — try again in ${r.retryAfterSeconds} s.` },
  };
}

const toState = (
  r: { ok: boolean; message: string; fields?: Record<string, string> },
  formData: FormData,
): FormState =>
  r.ok
    ? { status: "ok", message: r.message }
    : { status: "error", message: r.message, fields: r.fields, values: echoValues(formData) };

function revalidateOrder(orderNo: string): void {
  revalidatePath(`/admin/orders/${orderNo}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/** Courier & Tracking panel → "Save & mark as Shipped". */
export async function addTrackingCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addTrackingCodeSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    notify: formData.get("notify") === "on",
  });
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminAddTrackingCode(parsed.data, ip);
  if (r.ok) revalidateOrder(parsed.data.orderNo);
  return toState(r, formData);
}

/** Delivered + COD collected, returned, or cancelled by Teleshop. */
export async function adminPackageStepAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = adminPackageStepSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminPackageStep(parsed.data, ip);
  if (r.ok) revalidateOrder(parsed.data.orderNo);
  return toState(r, formData);
}

const sellerDecisionSchema = z.object({
  id: objectId,
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).default(""),
});

export async function decideSellerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sellerDecisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminDecideSeller(parsed.data, ip);
  if (r.ok) {
    revalidatePath("/admin/sellers");
    revalidatePath(`/admin/sellers/${parsed.data.id}`);
    revalidatePath("/admin");
  }
  return toState(r, formData);
}

const productDecisionSchema = z.object({
  id: objectId,
  decision: z.enum(["approve", "return", "block"]),
  note: z.string().trim().max(300).default(""),
});

export async function moderateProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = productDecisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminModerateProduct(parsed.data, ip);
  if (r.ok) {
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.id}`);
    revalidatePath("/admin");
  }
  return toState(r, formData);
}
