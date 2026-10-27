import type { SessionUser } from "@/lib/auth/claims";

/** Saved addresses per user (docs/08 `addresses`). */
export const MAX_ADDRESSES = 10;

/** Addresses always belong to the signed-in user; the owner id comes from the session only. */
export function addressOwnerId(user: SessionUser): string {
  return user.id;
}
