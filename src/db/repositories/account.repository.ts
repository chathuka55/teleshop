import { connectDB } from "../mongoose";
import { AccountModel } from "../models/account.model";

/** Auth.js OAuth links (docs/08 `accounts`). Provider tokens are never stored. */
export async function findUserIdByAccount(
  provider: string,
  providerAccountId: string,
): Promise<string | null> {
  await connectDB();
  const a = await AccountModel.findOne({ provider, providerAccountId })
    .select("userId")
    .lean<{ userId: { toString(): string } }>();
  return a ? a.userId.toString() : null;
}

/** Idempotent: linking the same provider account twice is a no-op. */
export async function linkAccount(
  userId: string,
  provider: string,
  providerAccountId: string,
): Promise<void> {
  await connectDB();
  await AccountModel.updateOne(
    { provider, providerAccountId },
    { $setOnInsert: { userId, provider, providerAccountId, type: "oauth" } },
    { upsert: true },
  );
}
