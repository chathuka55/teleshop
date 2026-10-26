import "server-only";
import { auth } from "./index";
import { AuthorizationError, assertRole } from "./authorize";
import { parseSessionUser, type Role, type SessionUser } from "./claims";

export {
  AuthorizationError,
  assertEmailVerified,
  assertOwnsUserResource,
  assertSellerOwns,
} from "./authorize";

/** The signed-in user (re-checked against the database every 5 min), or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return parseSessionUser(session?.user);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("UNAUTHENTICATED");
  return user;
}

/** Service-level role check (RULES.md): call it in every service that changes data. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  return assertRole(await getCurrentUser(), roles);
}
