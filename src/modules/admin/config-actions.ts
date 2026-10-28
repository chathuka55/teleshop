"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { fieldPathErrors } from "@/modules/products/form-errors";
import { brandSchema, categorySchema, courierSchema, settingsSchema } from "./config-schema";
import { adminSaveBrand, adminSaveCategory, adminSaveCourier, adminSaveSettings } from "./session";

/* Admin configuration Server Actions: parse (Zod) → rate limit 60/min → service (admin + TOTP). */

async function limited(): Promise<{ ip: string | null; blocked: string | null }> {
  const ip = await clientIp();
  const r = await rateLimit(`admin:${ip ?? "unknown"}`, { limit: 60, windowMs: 60_000 });
  return { ip, blocked: r.ok ? null : `Slow down — try again in ${r.retryAfterSeconds} s.` };
}

const toState = (
  r: { ok: boolean; message: string; fields?: Record<string, string> },
  formData: FormData,
): FormState =>
  r.ok
    ? { status: "ok", message: r.message }
    : { status: "error", message: r.message, fields: r.fields, values: echoValues(formData) };

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return { status: "error", message: blocked };
  const r = await adminSaveSettings(parsed.data, ip);
  if (r.ok) {
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    revalidatePath("/cart");
  }
  return toState(r, formData);
}

export async function saveCourierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = courierSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return { status: "error", message: blocked };
  const r = await adminSaveCourier(parsed.data, ip);
  if (r.ok) revalidatePath("/admin/settings");
  return toState(r, formData);
}

export async function saveBrandAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = brandSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return { status: "error", message: blocked };
  const r = await adminSaveBrand(parsed.data, ip);
  if (r.ok) {
    revalidatePath("/admin/catalog");
    revalidatePath("/", "layout");
  }
  return toState(r, formData);
}

/** The spec editor sends the whole category as an object (fields are a list). */
export async function saveCategoryAction(
  input: unknown,
): Promise<{ ok: boolean; message: string; id?: string; fields?: Record<string, string> }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fields: fieldPathErrors(parsed.error),
    };
  }
  const { ip, blocked } = await limited();
  if (blocked) return { ok: false, message: blocked };
  const r = await adminSaveCategory(parsed.data, ip);
  if (r.ok) {
    revalidateTag("categories");
    revalidatePath("/admin/catalog");
    revalidatePath("/", "layout");
  }
  return r;
}
