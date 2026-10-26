import type { Types } from "mongoose";
import { connectDB } from "../mongoose";
import { UserModel } from "../models/user.model";

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
