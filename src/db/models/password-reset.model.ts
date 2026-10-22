import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, ref } from "./_shared";

/** Single-use reset tokens (30 min). SHA-256 of a 32-byte random token. */
const passwordResetSchema = new Schema(
  {
    userId: ref("User"),
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  baseOptions,
);
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetDoc = InferSchemaType<typeof passwordResetSchema>;
export const PasswordResetModel =
  (models.PasswordReset as Model<PasswordResetDoc> | undefined) ??
  model<PasswordResetDoc>("PasswordReset", passwordResetSchema, "password_resets");
