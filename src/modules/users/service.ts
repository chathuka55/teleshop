import "server-only";
import {
  bumpTokenVersion,
  changePasswordAndRevokeSessions,
  findPasswordHash,
  findUserById,
  updateUserProfile,
  type UserDTO,
} from "@/db/repositories/user.repository";
import { isBreachedPassword } from "@/lib/auth/breached";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { audit } from "@/modules/audit/service";
import { accountIdFor, canChangePassword } from "./access";
import type { ChangePasswordInput, ProfileInput } from "./schema";
import type { ChangePasswordResult } from "./types";

/** Account service (P2-T06): every function acts on the signed-in user only. */

export async function getMyProfile(): Promise<UserDTO & { hasPassword: boolean }> {
  const user = await requireUser();
  const id = accountIdFor(user);
  const [profile, hash] = await Promise.all([findUserById(id), findPasswordHash(id)]);
  if (!profile) throw new Error("Signed-in user not found");
  return { ...profile, hasPassword: !!hash };
}

export async function updateMyProfile(input: ProfileInput, ip: string | null): Promise<void> {
  const user = await requireUser();
  await updateUserProfile(accountIdFor(user), input);
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "user.profile_updated",
    entity: "user",
    entityId: user.id,
    data: { fields: ["name", "phone"] },
    ip,
  });
}

/**
 * Change password from the account page. The current password must match; the new one must not
 * be breached. Success signs out every session (tokenVersion) — the action then signs this one out.
 */
export async function changeMyPassword(
  input: ChangePasswordInput,
  ip: string | null,
): Promise<ChangePasswordResult> {
  const user = await requireUser();
  const id = accountIdFor(user);
  const hash = await findPasswordHash(id);
  if (!canChangePassword(!!hash) || !hash) {
    return {
      ok: false,
      field: "currentPassword",
      message: "This account signs in with Google and has no password.",
    };
  }
  if (!(await verifyPassword(hash, input.currentPassword))) {
    return { ok: false, field: "currentPassword", message: "Your current password is not correct." };
  }
  if (await isBreachedPassword(input.password)) {
    return {
      ok: false,
      field: "password",
      message: "This password has appeared in a data breach. Please choose a different one.",
    };
  }
  await changePasswordAndRevokeSessions(id, await hashPassword(input.password));
  await audit.log({
    actorId: id,
    actorRole: user.role,
    action: "auth.password_changed",
    entity: "user",
    entityId: id,
    ip,
  });
  return { ok: true };
}

/** Invalidates every session of this user (lost phone, shared computer…). */
export async function signOutEverywhere(ip: string | null): Promise<void> {
  const user = await requireUser();
  await bumpTokenVersion(accountIdFor(user));
  await audit.log({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.sign_out_everywhere",
    entity: "user",
    entityId: user.id,
    ip,
  });
}
