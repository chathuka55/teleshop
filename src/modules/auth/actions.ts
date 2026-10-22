"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { forgotPasswordSchema, registerSchema, sellerApplicationSchema, signInSchema } from "./schema";

/*
 * Auth Server Actions — parse (Zod) → rate limit 5/min/IP (docs/09 §3) → service.
 * The service calls (Auth.js, Argon2id, users collection) arrive in P2-T01…T03 with the database.
 * Until then a valid submission returns NOT_CONNECTED instead of pretending to succeed.
 */

const notConnected = (formData: FormData): FormState => ({
  status: "error",
  message: "Accounts aren’t connected yet — this form goes live when the database is set up (Phase 2).",
  values: echoValues(formData),
});

async function limited(scope: string): Promise<FormState | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const r = await rateLimit(`${scope}:${ip}`, { limit: 5, windowMs: 60_000 });
  return r.ok
    ? null
    : { status: "error", message: `Too many attempts. Try again in ${r.retryAfterSeconds} seconds.` };
}

const fd = (formData: FormData): Record<string, FormDataEntryValue | null> =>
  Object.fromEntries(formData.entries());

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  return (await limited("auth:signin")) ?? notConnected(formData);
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  return (await limited("auth:register")) ?? notConnected(formData);
}

export async function applySellerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sellerApplicationSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  return (await limited("seller:apply")) ?? notConnected(formData);
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  // P2-T03: answer "If an account exists for that email, a reset link is on its way" for every
  // email (no account enumeration) once tokens + email sending exist.
  return (await limited("auth:reset")) ?? notConnected(formData);
}
