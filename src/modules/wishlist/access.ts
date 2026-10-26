import type { SessionUser } from "@/lib/auth/claims";

/** A wishlist always belongs to the signed-in user; its owner id comes from the session only. */
export function wishlistOwnerId(user: SessionUser): string {
  return user.id;
}
