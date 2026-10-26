import { Types } from "mongoose";
import { connectDB } from "../mongoose";
import { WishlistModel } from "../models/wishlist.model";

/** Max saved products per user (docs/08 `wishlists`, validator ≤ 200). */
export const WISHLIST_MAX = 200;

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

/** Saved product ids, newest first. */
export async function getWishlistIds(userId: string): Promise<string[]> {
  await connectDB();
  const w = await WishlistModel.findOne({ userId })
    .select("productIds")
    .lean<{ productIds: Types.ObjectId[] }>();
  return (w?.productIds ?? []).map((id) => id.toString());
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  await connectDB();
  // $each + $position 0 keeps newest first; $slice keeps the list within the limit.
  await WishlistModel.updateOne({ userId }, { $pull: { productIds: oid(productId) } }, { upsert: true });
  await WishlistModel.updateOne(
    { userId },
    { $push: { productIds: { $each: [oid(productId)], $position: 0, $slice: WISHLIST_MAX } } },
  );
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await connectDB();
  await WishlistModel.updateOne({ userId }, { $pull: { productIds: oid(productId) } });
}

/** Adds ids saved as a guest (only those not saved yet), keeping the limit. */
export async function mergeIntoWishlist(userId: string, productIds: readonly string[]): Promise<void> {
  if (!productIds.length) return;
  await connectDB();
  const current = new Set(await getWishlistIds(userId));
  const fresh = productIds.filter((id) => !current.has(id)).map(oid);
  if (!fresh.length) return;
  await WishlistModel.updateOne(
    { userId },
    { $push: { productIds: { $each: fresh, $position: 0, $slice: WISHLIST_MAX } } },
    { upsert: true },
  );
}
