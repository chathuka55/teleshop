import "server-only";
import { findUserIdByAccount, linkAccount } from "@/db/repositories/account.repository";
import {
  consumePasswordReset,
  consumeVerificationToken,
  savePasswordReset,
  saveVerificationToken,
} from "@/db/repositories/auth-token.repository";
import { findApprovedSellerIdByUserId } from "@/db/repositories/seller.repository";
import {
  createUser,
  findAuthState,
  findLoginRecordByEmail,
  incrementFailedLogins,
  lockUserUntil,
  markEmailVerified,
  markEmailVerifiedByEmail,
  recordSuccessfulLogin,
  resetPasswordAndRevokeSessions,
  type AuthState,
} from "@/db/repositories/user.repository";
import { isBreachedPassword } from "@/lib/auth/breached";
import { RECHECK_MS, type TokenClaims } from "@/lib/auth/claims";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, looksLikeToken, newToken } from "@/lib/auth/tokens";
import { audit } from "@/modules/audit/service";
import { canSignIn, isLocked, lockAfterFailure } from "./access";
import { sendAlreadyRegisteredEmail, sendPasswordResetEmail, sendVerificationEmail } from "./emails";
import type {
  AuthContext,
  GoogleProfile,
  PasswordSignInResult,
  RegisterResult,
  ResetPasswordResult,
} from "./types";

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
export async function refreshClaims(
  claims: TokenClaims,
  now = new Date(),
  { force = false }: { force?: boolean } = {},
): Promise<TokenClaims | null> {
  // `force`: re-read now (e.g. right after a profile change) instead of waiting for the 5-min check.
  if (!force && now.getTime() - claims.checkedAt < RECHECK_MS) return claims;
  const user = await findAuthState(claims.id);
  if (!user || !canSignIn(user) || user.tokenVersion !== claims.tokenVersion) return null;
  return claimsFor(user, now, { twoFactorVerified: claims.twoFactorVerified });
}

// ---- Register + email verification (P2-T02) ----

/** Verification links last 24 h; reset links 30 min (docs/10 §1). */
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 30 * 60 * 1000;

const BREACHED =
  "This password has appeared in a data breach. Please choose a different one — a short sentence works well.";

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

async function issueVerification(email: string, name: string, now: Date): Promise<void> {
  const { token, hash } = newToken();
  await saveVerificationToken(email, hash, new Date(now.getTime() + VERIFY_TTL_MS));
  await sendVerificationEmail(email, name, token);
}

/**
 * Customer sign-up. The screen answer is the same whether or not the email already has an
 * account (no enumeration); the existing owner gets a "you already have an account" email
 * instead. The password is hashed on both paths so response time gives nothing away either.
 */
export async function registerCustomer(
  input: { name: string; email: string; phone: string; password: string },
  ctx: AuthContext,
): Promise<RegisterResult> {
  const now = ctx.now ?? new Date();
  if (await isBreachedPassword(input.password)) return { ok: false, field: "password", message: BREACHED };

  const passwordHash = await hashPassword(input.password);
  const existing = await findLoginRecordByEmail(input.email);
  if (existing) {
    await sendAlreadyRegisteredEmail(existing.email, existing.name);
    return { ok: true };
  }

  let user: AuthState;
  try {
    user = await createUser({
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash,
      emailVerified: null,
    });
  } catch (e) {
    if (isDuplicateKey(e)) return { ok: true }; // registered a moment ago by a parallel request
    throw e;
  }
  await issueVerification(user.email, user.name, now);
  await audit.log({
    actorId: user.id,
    actorRole: "customer",
    action: "auth.register",
    entity: "user",
    entityId: user.id,
    ip: ctx.ip,
  });
  return { ok: true };
}

/** Consumes a verification link. True when the email is now verified. */
export async function verifyEmail(token: unknown, ctx: AuthContext): Promise<boolean> {
  if (!looksLikeToken(token)) return false;
  const now = ctx.now ?? new Date();
  const email = await consumeVerificationToken(hashToken(token), now);
  if (!email) return false;
  const userId = await markEmailVerifiedByEmail(email, now);
  if (!userId) return false;
  await audit.log({
    actorId: userId,
    actorRole: "customer",
    action: "auth.email_verified",
    entity: "user",
    entityId: userId,
    ip: ctx.ip,
  });
  return true;
}

/** A fresh verification link for a signed-in user who hasn't verified yet. */
export async function resendVerification(userId: string, ctx: AuthContext): Promise<void> {
  const user = await findAuthState(userId);
  if (!user || user.emailVerified || !canSignIn(user)) return;
  await issueVerification(user.email, user.name, ctx.now ?? new Date());
}

// ---- Forgot / reset password (P2-T03) ----

/** Always "succeeds" from the caller's view: whether the email exists is never revealed. */
export async function requestPasswordReset(email: string, ctx: AuthContext): Promise<void> {
  const now = ctx.now ?? new Date();
  const user = await findLoginRecordByEmail(email);
  if (!user || !canSignIn(user)) return;
  const { token, hash } = newToken();
  await savePasswordReset(user.id, hash, new Date(now.getTime() + RESET_TTL_MS));
  await sendPasswordResetEmail(user.email, user.name, token);
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.reset_requested",
    entity: "user",
    entityId: user.id,
    ip: ctx.ip,
  });
}

/**
 * Sets a new password from a reset link: the link works once, and every existing session is
 * signed out (tokenVersion bump). The breach check runs first so a rejected password doesn't
 * burn the link.
 */
export async function resetPassword(
  input: { token: string; password: string },
  ctx: AuthContext,
): Promise<ResetPasswordResult> {
  if (!looksLikeToken(input.token)) return { ok: false, reason: "invalid" };
  if (await isBreachedPassword(input.password)) return { ok: false, reason: "breached", message: BREACHED };
  const now = ctx.now ?? new Date();
  const userId = await consumePasswordReset(hashToken(input.token), now);
  if (!userId) return { ok: false, reason: "invalid" };
  await resetPasswordAndRevokeSessions(userId, await hashPassword(input.password), now);
  const user = await findAuthState(userId);
  await audit.log({
    actorId: userId,
    actorRole: user?.role ?? "customer",
    action: "auth.password_reset",
    entity: "user",
    entityId: userId,
    ip: ctx.ip,
  });
  return { ok: true };
}
