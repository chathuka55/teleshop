"use server";

import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { z } from "zod";
import { unstable_update } from "@/lib/auth";
import { requireUser } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/route-access";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { confirmEnrolment, verifySecondFactor } from "./two-factor";

/** State for the 2FA forms (recovery codes are returned once, right after enrolment). */
export type TwoFactorFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "enrolled"; recoveryCodes: string[]; next: string; proof: string };

const codeSchema = z.object({
  code: z.string().trim().min(6, "Enter the 6-digit code").max(20),
  next: z.string().max(300).optional(),
});

/** Signed-in admin (TOTP not passed yet — that is what these actions do). */
async function adminInProgress() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

async function limited(userId: string): Promise<TwoFactorFormState | null> {
  // Per user, not per IP: 1 in a million per guess × 5 per minute keeps brute force hopeless.
  const r = await rateLimit(`auth:totp:${userId}`, { limit: 5, windowMs: 60_000 });
  return r.ok
    ? null
    : { status: "error", message: `Too many attempts. Try again in ${r.retryAfterSeconds} seconds.` };
}

/** Upgrades the session: the jwt callback redeems the one-time proof (never trusts the browser). */
async function upgradeSession(proof: string): Promise<void> {
  await unstable_update(Object.assign({}, { totpProof: proof }) as Partial<Session>);
}

export async function confirmEnrolmentAction(
  _prev: TwoFactorFormState,
  formData: FormData,
): Promise<TwoFactorFormState> {
  const user = await adminInProgress();
  const parsed = codeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Enter the 6-digit code from your app." };
  const blocked = await limited(user.id);
  if (blocked) return blocked;

  const r = await confirmEnrolment(user, parsed.data.code, await clientIp());
  if (!r.ok) return { status: "error", message: r.message };
  // The session is upgraded only when the admin continues (finishEnrolmentAction): upgrading here
  // re-renders /admin/login, which redirects away before the recovery codes are shown.
  return {
    status: "enrolled",
    recoveryCodes: r.recoveryCodes,
    next: safeNextPath(parsed.data.next, "/admin"),
    proof: r.proof,
  };
}

/** "I saved them — continue": redeems the enrolment proof, then opens the admin area. */
export async function finishEnrolmentAction(formData: FormData): Promise<void> {
  await adminInProgress();
  const proof = formData.get("proof");
  const next = formData.get("next");
  if (typeof proof === "string") await upgradeSession(proof);
  redirect(safeNextPath(typeof next === "string" ? next : null, "/admin"));
}

export async function verifySecondFactorAction(
  _prev: TwoFactorFormState,
  formData: FormData,
): Promise<TwoFactorFormState> {
  const user = await adminInProgress();
  const parsed = codeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "Enter the 6-digit code or a recovery code." };
  const blocked = await limited(user.id);
  if (blocked) return blocked;

  const r = await verifySecondFactor(user, parsed.data.code, await clientIp());
  if (!r.ok) return { status: "error", message: "That code didn't work. Use the newest code from your app." };
  await upgradeSession(r.proof);
  redirect(safeNextPath(parsed.data.next, "/admin"));
}
