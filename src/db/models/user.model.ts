import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, intMin } from "./_shared";

const twoFactorSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    /** AES-256-GCM encrypted TOTP secret (TOTP_ENCRYPTION_KEY) */
    secretEnc: { type: String, default: null },
    recoveryHashes: { type: [String], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    emailVerified: { type: Date, default: null },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** +947XXXXXXXX */
    phone: { type: String, default: null, match: /^\+94\d{9}$/ },
    image: { type: String, default: null },
    /** Argon2id; null for Google-only users. Never selected by default. */
    passwordHash: { type: String, default: null, select: false },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer", required: true },
    status: { type: String, enum: ["active", "suspended"], default: "active", required: true },
    /** bump to invalidate every session (the JWT carries it) */
    tokenVersion: intMin(0, { default: 0 }),
    twoFactor: { type: twoFactorSchema, default: () => ({}), select: false },
    failedLogins: intMin(0, { default: 0 }),
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  baseOptions,
);
userSchema.index({ role: 1, status: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel =
  (models.User as Model<UserDoc> | undefined) ?? model<UserDoc>("User", userSchema, "users");
