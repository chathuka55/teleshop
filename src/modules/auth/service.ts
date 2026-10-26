import "server-only";
import { findUserIdByAccount, linkAccount } from "@/db/repositories/account.repository";
import { findApprovedSellerIdByUserId } from "@/db/repositories/seller.repository";
import {
  createUser,
  findAuthState,
  findLoginRecordByEmail,
  incrementFailedLogins,
  lockUserUntil,
  markEmailVerified,
  recordSuccessfulLogin,
  type AuthState,
} from "@/db/repositories/user.repository";
import { RECHECK_MS, type TokenClaims } from "@/lib/auth/claims";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { audit } from "@/modules/audit/service";
import { canSignIn, isLocked, lockAfterFailure } from "./access";
import type { AuthContext, GoogleProfile, PasswordSignInResult } from "./types";

/**
 * Hash verified when the email is unknown or the account can't sign in, so every failure path
 * costs one Argon2id verify and response time doesn't reveal whether an account exists.
 */
let dummyHash: Promise<string> | null = null;
const timingDummy = (): Promise<string> => (dummyHash ??= hashPassword("teleshop-timing-dummy"));

async function claimsFor(
  user: AuthState,
  now: Date,
  extra: Partial<Pick<TokenClaims, "twoFactorVerified">> = {},
): Promise<TokenClaims> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    sellerId: user.role === "seller" ? await findApprovedSellerIdByUserId(user.id) : null,
    emailVerified: user.emailVerified,
    // Admins earn this with TOTP (P2-T05); it is never set by a password alone.
    twoFactorVerified: user.role === "admin" ? (extra.twoFactorVerified ?? false) : false,
    tokenVersion: user.tokenVersion,
    checkedAt: now.getTime(),
  };
}

/** Email + password sign-in with lockout after 5 failures (15 min). */
export async function signInWithPassword(
  input: { email: string; password: string },
  ctx: AuthContext,
): Promise<PasswordSignInResult> {
  const now = ctx.now ?? new Date();
  const user = await findLoginRecordByEmail(input.email);

  if (!user || !user.passwordHash || !canSignIn(user) || isLocked(user.lockedUntil, now)) {
    await verifyPassword(await timingDummy(), input.password);
    if (user) {
      const reason = !user.passwordHash ? "no_password" : !canSignIn(user) ? "suspended" : "locked";
      await audit.log({
        actorId: user.id,
        actorRole: user.role,
        action: "auth.login_blocked",
        entity: "user",
        entityId: user.id,
        data: { reason },
        ip: ctx.ip,
      });
    }
    return { ok: false };
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    const lockUntil = lockAfterFailure(await incrementFailedLogins(user.id), now);
    if (lockUntil) await lockUserUntil(user.id, lockUntil);
    await audit.log({
      actorId: user.id,
      actorRole: user.role,
      action: lockUntil ? "auth.locked" : "auth.login_failed",
      entity: "user",
      entityId: user.id,
      ip: ctx.ip,
    });
    return { ok: false };
  }

  await recordSuccessfulLogin(user.id, now);
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
    data: { method: "password" },
    ip: ctx.ip,
  });
  return { ok: true, claims: await claimsFor(user, now) };
}

/**
 * Google sign-in: an existing link wins; otherwise a user with the same email is linked (Google
 * has verified that address); otherwise a new customer is created. Unverified Google emails are
 * refused — linking on them would let someone take over an account.
 */
export async function signInWithGoogle(
  profile: GoogleProfile,
  ctx: AuthContext,
): Promise<TokenClaims | null> {
  if (!profile.emailVerified) return null;
  const now = ctx.now ?? new Date();

  let userId = await findUserIdByAccount("google", profile.providerAccountId);
  if (!userId) {
    const existing = await findLoginRecordByEmail(profile.email);
    userId =
      existing?.id ??
      (
        await createUser({
          email: profile.email,
          name: profile.name,
          image: profile.image,
          passwordHash: null,
          emailVerified: now,
        })
      ).id;
    await linkAccount(userId, "google", profile.providerAccountId);
    if (existing && !existing.emailVerified) await markEmailVerified(userId, now);
  }

  const user = await findAuthState(userId);
  if (!user || !canSignIn(user)) return null;
  await recordSuccessfulLogin(user.id, now);
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
    data: { method: "google" },
    ip: ctx.ip,
  });
  return claimsFor(user, now);
}

/**
 * Session re-check (every RECHECK_MS): returns fresh claims, the same claims when a check isn't
 * due yet, or null — which signs the user out — when the account is gone, suspended, or its
 * tokenVersion was bumped (password change, "sign out everywhere", admin action).
 */
export async function refreshClaims(claims: TokenClaims, now = new Date()): Promise<TokenClaims | null> {
  if (now.getTime() - claims.checkedAt < RECHECK_MS) return claims;
  const user = await findAuthState(claims.id);
  if (!user || !canSignIn(user) || user.tokenVersion !== claims.tokenVersion) return null;
  return claimsFor(user, now, { twoFactorVerified: claims.twoFactorVerified });
}
