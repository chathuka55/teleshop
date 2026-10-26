"use server";

import { revalidatePath } from "next/cache";
import { mergeWishlistSchema, toggleWishlistSchema } from "./schema";
import { syncWishlist, toggleWishlist } from "./service";
import type { ToggleWishlistResult } from "./types";

/** Heart button. Guests get `guest` back and keep the item in the browser only. */
export async function toggleWishlistAction(
  productId: unknown,
  saved: unknown,
): Promise<ToggleWishlistResult> {
  const parsed = toggleWishlistSchema.safeParse({ productId, saved });
  if (!parsed.success) return { status: "guest" };
  const result = await toggleWishlist(parsed.data.productId, parsed.data.saved);
  if (result.status !== "guest") revalidatePath("/account/wishlist");
  return result;
}

/** Called once on /account/wishlist with the browser's list; returns the server list. */
export async function syncWishlistAction(guestIds: unknown): Promise<string[]> {
  const parsed = mergeWishlistSchema.safeParse(guestIds);
  return syncWishlist(parsed.success ? parsed.data : []);
}
