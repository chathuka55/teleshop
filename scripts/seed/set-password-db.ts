import { randomBytes } from "node:crypto";
import { insertAuditLog } from "@/db/repositories/audit-log.repository";
import { findShopsByOwnerIds, type OwnedShop } from "@/db/repositories/seller.repository";
import {
  findUserIdentities,
  resetPasswordAndRevokeSessions,
  type UserIdentity,
} from "@/db/repositories/user.repository";
import { hashPassword } from "@/lib/auth/password";

/** Random readable password, printed once by the CLI (db:seed and db:set-password). */
export function devPassword(): string {
  return `Ts-${randomBytes(9).toString("base64url")}`;
}

export type PasswordSetResult = UserIdentity & { shop: OwnedShop | null; password: string };

/**
 * New random password for each target account: clears the lockout and signs out every session
 * (same as a reset by email). The password is returned once and never stored or logged.
 */
export async function setPasswords(
  target: { emails: string[] } | { role: "seller" },
  now = new Date(),
): Promise<{ updated: PasswordSetResult[]; notFound: string[] }> {
  const users = await findUserIdentities(target);
  const shops = await findShopsByOwnerIds(users.filter((u) => u.role === "seller").map((u) => u.id));

  const updated: PasswordSetResult[] = [];
  for (const user of users) {
    const password = devPassword();
    await resetPasswordAndRevokeSessions(user.id, await hashPassword(password), now);
    await insertAuditLog({
      actorId: null,
      actorRole: "system",
      action: "auth.password_set_cli",
      entity: "user",
      entityId: user.id,
    });
    updated.push({ ...user, shop: shops.get(user.id) ?? null, password });
  }

  const found = new Set(users.map((u) => u.email));
  const notFound = "emails" in target ? target.emails.filter((e) => !found.has(e.toLowerCase())) : [];
  return { updated, notFound };
}
