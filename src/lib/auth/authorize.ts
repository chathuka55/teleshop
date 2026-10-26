import type { Role, SessionUser } from "./claims";

/** Thrown by guards; actions turn it into a sign-in redirect or a "not allowed" message. */
export class AuthorizationError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "EMAIL_UNVERIFIED",
    message = code === "UNAUTHENTICATED" ? "Please sign in." : "You are not allowed to do that.",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Pure role check behind requireRole(). Admins must also have passed TOTP; sellers must own an
 * approved shop. Throws AuthorizationError, never returns false, so a forgotten `if` can't leak.
 */
export function assertRole(user: SessionUser | null, roles: readonly Role[]): SessionUser {
  if (!user) throw new AuthorizationError("UNAUTHENTICATED");
  if (!roles.includes(user.role)) throw new AuthorizationError("FORBIDDEN");
  if (user.role === "admin" && !user.twoFactorVerified) throw new AuthorizationError("FORBIDDEN");
  if (user.role === "seller" && !user.sellerId) throw new AuthorizationError("FORBIDDEN");
  return user;
}

/** Seller ownership: `resourceSellerId` must be the signed-in seller's shop. Admins may act on any. */
export function assertSellerOwns(user: SessionUser, resourceSellerId: string): void {
  if (user.role === "admin" && user.twoFactorVerified) return;
  if (user.role !== "seller" || !user.sellerId || user.sellerId !== resourceSellerId) {
    throw new AuthorizationError("FORBIDDEN");
  }
}

/** Customer ownership: the record must belong to the signed-in user. */
export function assertOwnsUserResource(user: SessionUser, resourceUserId: string): void {
  if (user.id !== resourceUserId) throw new AuthorizationError("FORBIDDEN");
}

/** Checkout needs a verified email (docs/10 §1: email verification before checkout). */
export function assertEmailVerified(user: SessionUser): void {
  if (!user.emailVerified)
    throw new AuthorizationError("EMAIL_UNVERIFIED", "Please verify your email first.");
}
