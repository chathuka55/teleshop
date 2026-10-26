import "server-only";
import { randomBytes } from "node:crypto";
import {
  acceptTotpStep,
  consumeRecoveryCode,
  consumeTwoFactorProof,
  enableTwoFactor,
  getTwoFactorState,
  savePendingTwoFactorSecret,
  saveTwoFactorProof,
} from "@/db/repositories/user.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { hashToken } from "@/lib/auth/tokens";
import {
  checkTotp,
  decryptSecret,
  encryptSecret,
  formatManualKey,
  hashRecoveryCode,
  newRecoveryCodes,
  newTotpSecret,
  qrDataUri,
} from "@/lib/auth/totp";
import { audit } from "@/modules/audit/service";

/**
 * Admin two-step verification (P2-T05). A correct code yields a one-time *proof*; the session is
 * upgraded only when the server redeems that proof in the Auth.js jwt callback. Data sent by the
 * browser to /api/auth/session can never mark a session as verified on its own.
 */

/** The proof is valid for 60 s and works once. */
const PROOF_TTL_MS = 60_000;
/** After enrolment the admin first saves the recovery codes, then continues — allow 10 minutes. */
const ENROL_PROOF_TTL_MS = 10 * 60_000;

export type TwoFactorScreen =
  { kind: "enrol"; qr: string; manualKey: string } | { kind: "verify"; recoveryLeft: number };

/** What /admin/login shows to a signed-in admin: enrolment (QR) or the code prompt. */
export async function twoFactorScreen(user: SessionUser): Promise<TwoFactorScreen> {
  const state = await getTwoFactorState(user.id);
  if (state.enabled) return { kind: "verify", recoveryLeft: state.recoveryCount };
  // Reuse a pending secret so reloading the page doesn't invalidate a QR already scanned.
  let secret = state.secretEnc ? decryptSecret(state.secretEnc) : null;
  if (!secret) {
    secret = newTotpSecret();
    await savePendingTwoFactorSecret(user.id, encryptSecret(secret));
  }
  return { kind: "enrol", qr: await qrDataUri(user.email, secret), manualKey: formatManualKey(secret) };
}

async function issueProof(userId: string, ttlMs = PROOF_TTL_MS): Promise<string> {
  const proof = randomBytes(32).toString("base64url");
  await saveTwoFactorProof(userId, hashToken(proof), new Date(Date.now() + ttlMs));
  return proof;
}

export type EnrolResult =
  { ok: true; recoveryCodes: string[]; proof: string } | { ok: false; message: string };

/** Enrolment step 2: the first correct code turns 2FA on and returns the recovery codes (shown once). */
export async function confirmEnrolment(
  user: SessionUser,
  code: string,
  ip: string | null,
): Promise<EnrolResult> {
  const state = await getTwoFactorState(user.id);
  if (state.enabled) return { ok: false, message: "Two-step verification is already on." };
  if (!state.secretEnc) return { ok: false, message: "Reload the page to get a new QR code." };
  const r = await checkTotp(decryptSecret(state.secretEnc), code.trim(), 0);
  if (!r.ok)
    return {
      ok: false,
      message: "That code didn't match. Check the time on your phone and try the next code.",
    };

  const { codes, hashes } = newRecoveryCodes();
  await enableTwoFactor(user.id, hashes, r.step);
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.totp_enrolled",
    entity: "user",
    entityId: user.id,
    ip,
  });
  return { ok: true, recoveryCodes: codes, proof: await issueProof(user.id, ENROL_PROOF_TTL_MS) };
}

export type VerifyResult = { ok: true; proof: string; usedRecoveryCode: boolean } | { ok: false };

/** Sign-in step 2: a 6-digit code, or a recovery code (single use). */
export async function verifySecondFactor(
  user: SessionUser,
  input: string,
  ip: string | null,
): Promise<VerifyResult> {
  const state = await getTwoFactorState(user.id);
  if (!state.enabled || !state.secretEnc) return { ok: false };
  const code = input.trim();

  if (/^\d{6}$/.test(code)) {
    const r = await checkTotp(decryptSecret(state.secretEnc), code, state.lastStep);
    // acceptTotpStep is atomic: two requests with the same code can't both win.
    if (r.ok && (await acceptTotpStep(user.id, r.step))) {
      await audit.log({
        actorId: user.id,
        actorRole: user.role,
        action: "auth.totp_verified",
        entity: "user",
        entityId: user.id,
        ip,
      });
      return { ok: true, proof: await issueProof(user.id), usedRecoveryCode: false };
    }
  } else if (await consumeRecoveryCode(user.id, hashRecoveryCode(code))) {
    await audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.recovery_code_used",
      entity: "user",
      entityId: user.id,
      data: { left: Math.max(0, state.recoveryCount - 1) },
      ip,
    });
    return { ok: true, proof: await issueProof(user.id), usedRecoveryCode: true };
  }

  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.totp_failed",
    entity: "user",
    entityId: user.id,
    ip,
  });
  return { ok: false };
}

/** Called from the jwt callback on `update`: true when `proof` is this user's live, unused proof. */
export async function redeemTwoFactorProof(userId: string, proof: unknown): Promise<boolean> {
  if (typeof proof !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(proof)) return false;
  return consumeTwoFactorProof(userId, hashToken(proof), new Date());
}
