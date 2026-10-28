"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { objectId } from "@/lib/validation/common";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { addTrackingCodeSchema, adminPackageStepSchema } from "@/modules/orders/admin-schema";
import {
  adminAddTrackingCode,
  adminCreatePayout,
  adminDecideSeller,
  adminMarkPayoutPaid,
  adminModerateProduct,
  adminModerateReview,
  adminPackageStep,
  adminSetCustomerStatus,
} from "./session";

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
  decision: z.enum(["approve", "reject", "suspend", "reinstate"]),
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

const customerStatusSchema = z.object({
  id: objectId,
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().max(300).default(""),
});

export async function customerStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = customerStatusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminSetCustomerStatus(parsed.data, ip);
  if (r.ok) revalidatePath("/admin/customers");
  return toState(r, formData);
}

const reviewSchema = z.object({
  id: objectId,
  action: z.enum(["hide", "show"]),
  reason: z.string().trim().max(300).default(""),
});

export async function moderateReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminModerateReview(parsed.data, ip);
  if (!r.ok) return toState(r, formData);
  revalidatePath("/admin/reviews");
  revalidatePath("/p/[slug]", "page");
  // The review leaves the tab it was on: confirm at the top of that tab.
  redirect(
    parsed.data.action === "hide" ? "/admin/reviews?done=hidden" : "/admin/reviews?status=hidden&done=shown",
  );
}

export async function createPayoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = objectId.safeParse(formData.get("sellerId"));
  if (!id.success) return { status: "error", message: "Reload the page and try again." };
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminCreatePayout(id.data, ip);
  if (!r.ok) return toState(r, formData);
  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?done=scheduled");
}

const payoutPaidSchema = z.object({
  id: objectId,
  reference: z.string().trim().min(1, "Enter the reference").max(80),
});

export async function markPayoutPaidAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = payoutPaidSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await adminMarkPayoutPaid(parsed.data, ip);
  if (!r.ok) return toState(r, formData);
  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?done=paid");
}
