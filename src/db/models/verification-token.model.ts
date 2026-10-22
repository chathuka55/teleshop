import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions } from "./_shared";

/** Email verification. Only the SHA-256 hash is stored; the raw token is only in the email. */
const verificationTokenSchema = new Schema(
  {
    identifier: { type: String, required: true, lowercase: true },
    tokenHash: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  baseOptions,
);
verificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export type VerificationTokenDoc = InferSchemaType<typeof verificationTokenSchema>;
export const VerificationTokenModel =
  (models.VerificationToken as Model<VerificationTokenDoc> | undefined) ??
  model<VerificationTokenDoc>("VerificationToken", verificationTokenSchema, "verification_tokens");
