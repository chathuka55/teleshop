import "server-only";
import { findPublishedProductCardsByIds } from "@/db/repositories/product.repository";
import {
  addToWishlist,
  getWishlistIds,
  mergeIntoWishlist,
  removeFromWishlist,
} from "@/db/repositories/wishlist.repository";
import { getCurrentUser, requireUser } from "@/lib/auth/guards";
import type { ProductCardDTO } from "@/modules/catalog/types";
import { wishlistOwnerId } from "./access";
import type { ToggleWishlistResult } from "./types";

/**
 * Wishlist (P4-T02, wishlist part). Signed-in users: stored in `wishlists`. Guests: the browser
 * keeps the list (useWishlist) and it is merged here on the first visit to /account/wishlist.
 */

export async function toggleWishlist(productId: string, saved: boolean): Promise<ToggleWishlistResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "guest" };
  const owner = wishlistOwnerId(user);
  if (saved) await addToWishlist(owner, productId);
  else await removeFromWishlist(owner, productId);
  return { status: saved ? "saved" : "removed" };
}

/** Merges the guest list, then returns the full list (ids, newest first). */
export async function syncWishlist(guestIds: readonly string[]): Promise<string[]> {
  const owner = wishlistOwnerId(await requireUser());
  // Only ids of real, published products are merged.
  const existing = (await findPublishedProductCardsByIds(guestIds)).map((p) => p.id);
  await mergeIntoWishlist(owner, existing);
  return getWishlistIds(owner);
}

export async function getMyWishlist(): Promise<ProductCardDTO[]> {
  const owner = wishlistOwnerId(await requireUser());
  return findPublishedProductCardsByIds(await getWishlistIds(owner));
}
