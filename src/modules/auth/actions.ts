"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { requireUser } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/route-access";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  sellerApplicationSchema,
  signInSchema,
} from "./schema";
import { applyForShop } from "@/modules/sellers/seller";
import { registerCustomer, requestPasswordReset, resendVerification, resetPassword } from "./service";

/*
 * Auth Server Actions — parse (Zod) → rate limit 5/min/IP (docs/09 §3) → service.
 * Sign-in/out go through Auth.js (src/lib/auth); register, verification and password reset through
 * modules/auth/service; the seller application through modules/sellers (P6-T01).
 */

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
  const blocked = await limited("auth:register");
  if (blocked) return blocked;

  const { name, email, phone, password } = parsed.data;
  const result = await registerCustomer({ name, email, phone, password }, { ip: await clientIp() });
  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
      fields: { [result.field]: result.message },
      values: echoValues(formData),
    };
  }
  // Same answer whether or not the email already had an account (no enumeration).
  return {
    status: "ok",
    message: `Almost there! We've sent a verification link to ${email}. Open it, then sign in.`,
  };
}

export async function applySellerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sellerApplicationSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const blocked = await limited("seller:apply");
  if (blocked) return { ...blocked, values: echoValues(formData) } as FormState;
  const file = formData.get("brDocument");
  const document = file instanceof File && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null;
  const r = await applyForShop(parsed.data, document, await clientIp());
  if (!r.ok) return { status: "error", message: r.message, fields: r.fields, values: echoValues(formData) };
  revalidatePath("/register/seller");
  return { status: "ok", message: r.message };
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const blocked = await limited("auth:reset");
  if (blocked) return blocked;
  await requestPasswordReset(parsed.data.email, { ip: await clientIp() });
  // Identical for every email — never reveal whether an account exists.
  return {
    status: "ok",
    message: "If an account exists for that email, a reset link is on its way. It expires in 30 minutes.",
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const blocked = await limited("auth:reset");
  if (blocked) return blocked;

  const result = await resetPassword(
    { token: parsed.data.token, password: parsed.data.password },
    { ip: await clientIp() },
  );
  if (result.ok) {
    return {
      status: "ok",
      message: "Password changed — you're signed out on every device. Sign in with your new password.",
    };
  }
  if (result.reason === "breached") {
    return { status: "error", message: result.message, fields: { password: result.message } };
  }
  return {
    status: "error",
    message: "This reset link is invalid or has expired. Request a new one from “Forgot password”.",
  };
}

/** For signed-in users who lost the first email. */
export async function resendVerificationAction(): Promise<FormState> {
  const user = await requireUser();
  const blocked = await limited("auth:verify-resend");
  if (blocked) return blocked;
  await resendVerification(user.id, { ip: await clientIp() });
  return { status: "ok", message: `A new verification link is on its way to ${user.email}.` };
}
