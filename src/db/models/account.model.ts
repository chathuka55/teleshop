import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, ref } from "./_shared";

/** Auth.js OAuth links. Provider tokens are not stored (we never call Google APIs). */
const accountSchema = new Schema(
  {
    userId: ref("User"),
    type: { type: String, default: "oauth" },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
  },
  baseOptions,
);
accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
accountSchema.index({ userId: 1 });

export type AccountDoc = InferSchemaType<typeof accountSchema>;
export const AccountModel =
  (models.Account as Model<AccountDoc> | undefined) ??
  model<AccountDoc>("Account", accountSchema, "accounts");
