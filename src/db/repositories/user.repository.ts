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
