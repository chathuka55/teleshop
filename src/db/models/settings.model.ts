import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { cents, intMin } from "./_shared";

/** Single document `_id: "global"` (docs/08 §3.1). */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    deliveryFeeCents: { ...cents(), default: 45_000 },
    expressFeeCents: { ...cents(), default: 95_000 },
    codEnabled: { type: Boolean, default: true },
    autoCancelHours: intMin(1, { default: 48 }),
    /** basis points: 300 = 3 % */
    platformFeeBp: intMin(0, { default: 300, max: 10_000 }),
  },
  { timestamps: true, strict: "throw" },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;
export const SettingsModel =
  (models.Settings as Model<SettingsDoc> | undefined) ??
  model<SettingsDoc>("Settings", settingsSchema, "settings");
