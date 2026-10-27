import type { ClientSession } from "mongoose";
import type { CartItemInput } from "@/modules/cart/types";
import { connectDB } from "../mongoose";
import { CartModel } from "../models/cart.model";

/** Signed-in users' carts (docs/08 `carts`): SKU + qty only — never prices. */

export async function getUserCartItems(userId: string): Promise<CartItemInput[]> {
  await connectDB();
  const c = await CartModel.findOne({ userId }).select("items").lean<{ items: CartItemInput[] }>();
  return (c?.items ?? []).map(({ sku, qty }) => ({ sku, qty }));
}

export async function saveUserCartItems(userId: string, items: readonly CartItemInput[]): Promise<void> {
  await connectDB();
  const now = new Date();
  await CartModel.updateOne(
    { userId },
    { $set: { items: items.map(({ sku, qty }) => ({ sku, qty, addedAt: now })) } },
    { upsert: true },
  );
}

/** Empties the cart — part of the placeOrder transaction. */
export async function clearUserCart(userId: string, session?: ClientSession): Promise<void> {
  await CartModel.updateOne({ userId }, { $set: { items: [] } }, { session });
}
