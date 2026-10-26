"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/route-access";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { forgotPasswordSchema, registerSchema, sellerApplicationSchema, signInSchema } from "./schema";

/*
 * Auth Server Actions — parse (Zod) → rate limit 5/min/IP (docs/09 §3) → service.
 * Sign-in/out go through Auth.js (src/lib/auth). Register, seller application and password reset
 * still return NOT_CONNECTED until P2-T02/T03 land, instead of pretending to succeed.
 */

const notConnected = (formData: FormData): FormState => ({
  status: "error",
  message: "Accounts aren’t connected yet — this form goes live when the database is set up (Phase 2).",
  values: echoValues(formData),
});

async function limited(scope: string): Promise<FormState | null> {
  const ip = (await clientIp()) ?? "unknown";
  const r = await rateLimit(`${scope}:${ip}`, { limit: 5, windowMs: 60_000 });
  return r.ok
    ? null
    : { status: "error", message: `Too many attempts. Try again in ${r.retryAfterSeconds} seconds.` };
}

const fd = (formData: FormData): Record<string, FormDataEntryValue | null> =>
  Object.fromEntries(formData.entries());

/** One message for every failure — never reveal whether the email exists (docs/10 §1). */
const SIGN_IN_FAILED =
  "Email or password is incorrect. After 5 failed attempts the account is locked for 15 minutes — you can reset your password instead.";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const blocked = await limited("auth:signin");
  if (blocked) return blocked;

  const redirectTo = safeNextPath(formData.get("next")?.toString());
  try {
    // On success Auth.js throws Next's redirect — it must propagate, so only AuthError is caught.
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: SIGN_IN_FAILED, values: echoValues(formData) };
    }
    throw error;
  }
  return { status: "ok", message: "Signed in." };
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeNextPath(formData.get("next")?.toString()) });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
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
