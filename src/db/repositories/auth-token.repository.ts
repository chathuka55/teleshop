import { connectDB } from "../mongoose";
import { PasswordResetModel } from "../models/password-reset.model";
import { VerificationTokenModel } from "../models/verification-token.model";
import { $gt } from "../operators";

/**
 * Email-link tokens (docs/08 `verification_tokens`, `password_resets`). Only SHA-256 hashes are
 * stored. "Consume" is a single atomic operation, so a token works exactly once even when a link
 * is clicked twice at the same moment.
 */

/** Replaces any earlier verification link for this email. */
export async function saveVerificationToken(email: string, tokenHash: string, expires: Date): Promise<void> {
  await connectDB();
  const identifier = email.toLowerCase();
  await VerificationTokenModel.deleteMany({ identifier });
  await VerificationTokenModel.create({ identifier, tokenHash, expires });
}

/** Returns the email the token was issued for, or null (unknown, used or expired). */
export async function consumeVerificationToken(tokenHash: string, now: Date): Promise<string | null> {
  await connectDB();
  const t = await VerificationTokenModel.findOneAndDelete({ tokenHash, expires: $gt(now) })
    .select("identifier")
    .lean<{ identifier: string }>();
  return t?.identifier ?? null;
}

/** Replaces any earlier unused reset link for this user. */
export async function savePasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await connectDB();
  await PasswordResetModel.deleteMany({ userId, usedAt: null });
  await PasswordResetModel.create({ userId, tokenHash, expiresAt });
}

/** Marks the token used and returns its user id, or null (unknown, used or expired). */
export async function consumePasswordReset(tokenHash: string, now: Date): Promise<string | null> {
  await connectDB();
  const t = await PasswordResetModel.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: $gt(now) },
    { $set: { usedAt: now } },
  )
    .select("userId")
    .lean<{ userId: { toString(): string } }>();
  return t ? t.userId.toString() : null;
}
