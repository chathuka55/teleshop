import type { Types } from "mongoose";
import { connectDB } from "../mongoose";
import { UserModel } from "../models/user.model";
import { $gt, $in, $lt, $ne } from "../operators";

/** Safe user DTO — never contains passwordHash, twoFactor secrets or lockout counters. */
export type UserDTO = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  image: string | null;
  role: "customer" | "seller" | "admin";
  status: "active" | "suspended";
  emailVerified: boolean;
};

type LeanUser = {
  _id: Types.ObjectId;
  email: string;
  name: string;
  phone?: string | null;
  image?: string | null;
  role: UserDTO["role"];
  status: UserDTO["status"];
  emailVerified?: Date | null;
};

const SAFE_FIELDS = "email name phone image role status emailVerified";

export function toUserDTO(u: LeanUser): UserDTO {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    phone: u.phone ?? null,
    image: u.image ?? null,
    role: u.role,
    status: u.status,
    emailVerified: !!u.emailVerified,
  };
}

export async function findUserByEmail(email: string): Promise<UserDTO | null> {
  await connectDB();
  const u = await UserModel.findOne({ email: email.toLowerCase() }).select(SAFE_FIELDS).lean<LeanUser>();
  return u ? toUserDTO(u) : null;
}

export async function findUserById(id: string): Promise<UserDTO | null> {
  await connectDB();
  const u = await UserModel.findById(id).select(SAFE_FIELDS).lean<LeanUser>();
  return u ? toUserDTO(u) : null;
}

// ---- Auth (P2-T01) — used only by modules/auth/service.ts ----

/** Everything sign-in needs. Contains the password hash: never return it past the auth service. */
export type LoginRecord = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: UserDTO["role"];
  status: UserDTO["status"];
  passwordHash: string | null;
  lockedUntil: Date | null;
  tokenVersion: number;
  emailVerified: boolean;
};

/** Fields the session re-check (every 5 min) compares against the JWT. */
export type AuthState = Pick<
  LoginRecord,
  "id" | "email" | "name" | "image" | "role" | "status" | "tokenVersion" | "emailVerified"
>;

type LeanLogin = LeanUser & {
  passwordHash?: string | null;
  lockedUntil?: Date | null;
  tokenVersion?: number;
};

function toAuthState(u: LeanLogin): AuthState {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    image: u.image ?? null,
    role: u.role,
    status: u.status,
    tokenVersion: u.tokenVersion ?? 0,
    emailVerified: !!u.emailVerified,
  };
}

export async function findLoginRecordByEmail(email: string): Promise<LoginRecord | null> {
  await connectDB();
  const u = await UserModel.findOne({ email: email.toLowerCase() })
    .select(`${SAFE_FIELDS} passwordHash lockedUntil tokenVersion`)
    .lean<LeanLogin>();
  if (!u) return null;
  return { ...toAuthState(u), passwordHash: u.passwordHash ?? null, lockedUntil: u.lockedUntil ?? null };
}

export async function findAuthState(id: string): Promise<AuthState | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDB();
  const u = await UserModel.findById(id).select(`${SAFE_FIELDS} tokenVersion`).lean<LeanLogin>();
  return u ? toAuthState(u) : null;
}

/** Atomically counts a failed password attempt; returns the new count. */
export async function incrementFailedLogins(id: string): Promise<number> {
  await connectDB();
  const u = await UserModel.findByIdAndUpdate(id, { $inc: { failedLogins: 1 } }, { new: true })
    .select("failedLogins")
    .lean<{ failedLogins?: number }>();
  return u?.failedLogins ?? 0;
}

export async function lockUserUntil(id: string, until: Date): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id }, { $set: { lockedUntil: until, failedLogins: 0 } });
}

export async function recordSuccessfulLogin(id: string, at: Date): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id }, { $set: { failedLogins: 0, lockedUntil: null, lastLoginAt: at } });
}

export async function createUser(input: {
  email: string;
  name: string;
  phone?: string | null;
  image?: string | null;
  passwordHash: string | null;
  emailVerified: Date | null;
}): Promise<AuthState> {
  await connectDB();
  const doc = await UserModel.create({ ...input, role: "customer", status: "active" });
  return toAuthState(doc.toObject() as LeanLogin);
}

export async function markEmailVerified(id: string, at: Date): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id, emailVerified: null }, { $set: { emailVerified: at } });
}

export async function markEmailVerifiedByEmail(email: string, at: Date): Promise<string | null> {
  await connectDB();
  const u = await UserModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    [{ $set: { emailVerified: { $ifNull: ["$emailVerified", at] } } }],
    { new: true },
  )
    .select("_id")
    .lean<{ _id: { toString(): string } }>();
  return u ? u._id.toString() : null;
}

/**
 * New password after a reset: clears the lockout and bumps tokenVersion, which signs the user out
 * on every device at the next session re-check. Proving inbox access also verifies the email.
 */
export async function resetPasswordAndRevokeSessions(
  id: string,
  passwordHash: string,
  at: Date,
): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id }, [
    {
      $set: {
        // $literal: in a pipeline a string starting with "$" (every Argon2 hash) is a field path.
        passwordHash: { $literal: passwordHash },
        failedLogins: 0,
        lockedUntil: null,
        tokenVersion: { $add: [{ $ifNull: ["$tokenVersion", 0] }, 1] },
        emailVerified: { $ifNull: ["$emailVerified", at] },
      },
    },
  ]);
}

export type UserIdentity = Pick<UserDTO, "id" | "email" | "role" | "status">;

/** Users by email or by role, sorted by email — for the db:set-password CLI. */
export async function findUserIdentities(
  filter: { emails: string[] } | { role: UserDTO["role"] },
): Promise<UserIdentity[]> {
  await connectDB();
  const query =
    "emails" in filter ? { email: $in(filter.emails.map((e) => e.toLowerCase())) } : { role: filter.role };
  const users = await UserModel.find(query)
    .select("email role status")
    .sort({ email: 1 })
    .lean<Pick<LeanUser, "_id" | "email" | "role" | "status">[]>();
  return users.map((u) => ({ id: u._id.toString(), email: u.email, role: u.role, status: u.status }));
}

// ---- Account (P2-T06) — used by modules/users/service.ts ----

export async function updateUserProfile(
  id: string,
  input: { name: string; phone: string | null },
): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id }, { $set: { name: input.name, phone: input.phone } });
}

export async function findPasswordHash(id: string): Promise<string | null> {
  await connectDB();
  const u = await UserModel.findById(id).select("+passwordHash").lean<{ passwordHash?: string | null }>();
  return u?.passwordHash ?? null;
}

/** New password from the account page: clears the lockout and signs out every session. */
export async function changePasswordAndRevokeSessions(id: string, passwordHash: string): Promise<void> {
  await connectDB();
  await UserModel.updateOne(
    { _id: id },
    { $set: { passwordHash, failedLogins: 0, lockedUntil: null }, $inc: { tokenVersion: 1 } },
  );
}

/** "Sign out everywhere": every JWT carrying the old tokenVersion is rejected at its next re-check. */
export async function bumpTokenVersion(id: string): Promise<void> {
  await connectDB();
  await UserModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
}

// ---- Admin TOTP 2FA (P2-T05) — used by modules/auth/two-factor.ts ----

export type TwoFactorState = {
  enabled: boolean;
  secretEnc: string | null;
  recoveryCount: number;
  lastStep: number;
};

export async function getTwoFactorState(id: string): Promise<TwoFactorState> {
  await connectDB();
  const u = await UserModel.findById(id).select("+twoFactor").lean<{
    twoFactor?: {
      enabled?: boolean;
      secretEnc?: string | null;
      recoveryHashes?: string[];
      lastStep?: number;
    };
  }>();
  const t = u?.twoFactor ?? {};
  return {
    enabled: !!t.enabled,
    secretEnc: t.secretEnc ?? null,
    recoveryCount: t.recoveryHashes?.length ?? 0,
    lastStep: t.lastStep ?? 0,
  };
}

/** Stores a not-yet-confirmed secret (enrolment step 1). Never touches an enabled 2FA. */
export async function savePendingTwoFactorSecret(id: string, secretEnc: string): Promise<void> {
  await connectDB();
  await UserModel.updateOne(
    { _id: id, "twoFactor.enabled": $ne(true) },
    { $set: { "twoFactor.secretEnc": secretEnc } },
  );
}

export async function enableTwoFactor(id: string, recoveryHashes: string[], step: number): Promise<void> {
  await connectDB();
  await UserModel.updateOne(
    { _id: id },
    {
      $set: {
        "twoFactor.enabled": true,
        "twoFactor.recoveryHashes": recoveryHashes,
        "twoFactor.lastStep": step,
      },
    },
  );
}

/** Atomic replay guard: only succeeds when `step` is newer than the last accepted one. */
export async function acceptTotpStep(id: string, step: number): Promise<boolean> {
  await connectDB();
  const r = await UserModel.updateOne(
    { _id: id, "twoFactor.lastStep": $lt(step) },
    { $set: { "twoFactor.lastStep": step } },
  );
  return r.modifiedCount === 1;
}

/** Atomically removes a recovery code; true only if it was there (single use). */
export async function consumeRecoveryCode(id: string, hash: string): Promise<boolean> {
  await connectDB();
  const r = await UserModel.updateOne(
    { _id: id, "twoFactor.recoveryHashes": hash },
    { $pull: { "twoFactor.recoveryHashes": hash } },
  );
  return r.modifiedCount === 1;
}

export async function saveTwoFactorProof(id: string, proofHash: string, expires: Date): Promise<void> {
  await connectDB();
  await UserModel.updateOne(
    { _id: id },
    { $set: { "twoFactor.proofHash": proofHash, "twoFactor.proofExpires": expires } },
  );
}

/** Redeems the one-time proof (single use, before expiry). */
export async function consumeTwoFactorProof(id: string, proofHash: string, now: Date): Promise<boolean> {
  await connectDB();
  const r = await UserModel.updateOne(
    { _id: id, "twoFactor.proofHash": proofHash, "twoFactor.proofExpires": $gt(now) },
    { $set: { "twoFactor.proofHash": null, "twoFactor.proofExpires": null } },
  );
  return r.modifiedCount === 1;
}

/** Sets (or clears) the profile photo; returns the previous URL so its file can be deleted. */
export async function updateUserImage(id: string, url: string | null): Promise<string | null> {
  await connectDB();
  const before = await UserModel.findByIdAndUpdate(id, { $set: { image: url } })
    .select("image")
    .lean<{ image?: string | null }>();
  return before?.image ?? null;
}
