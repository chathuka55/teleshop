"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/guards";
import { limitAction } from "@/lib/security/action-limit";
import { mergeWishlistSchema, toggleWishlistSchema } from "./schema";
import { syncWishlist, toggleWishlist } from "./service";
import type { ToggleWishlistResult } from "./types";

/**
 * Heart button. Guests get `guest` back and keep the item in the browser only. Over the limit
 * (30/min, doc 09) it is also kept in the browser; the next sync merges it in.
 */
export async function toggleWishlistAction(
  productId: unknown,
  saved: unknown,
): Promise<ToggleWishlistResult> {
  const parsed = toggleWishlistSchema.safeParse({ productId, saved });
  if (!parsed.success) return { status: "guest" };
  const user = await getCurrentUser();
  if (!user || !(await limitAction("wishlist", 30, user.id)).ok) return { status: "guest" };
  const result = await toggleWishlist(parsed.data.productId, parsed.data.saved);
  if (result.status !== "guest") revalidatePath("/account/wishlist");
  return result;
}

/** Called once on /account/wishlist with the browser's list; returns the server list. */
export async function syncWishlistAction(guestIds: unknown): Promise<string[]> {
  const parsed = mergeWishlistSchema.safeParse(guestIds);
  const user = await getCurrentUser();
  const allowed = !!user && (await limitAction("wishlist", 30, user.id)).ok;
  return syncWishlist(parsed.success && allowed ? parsed.data : []);
}
