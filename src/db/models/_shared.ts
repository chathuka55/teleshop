import { Schema, type SchemaTypeOptions } from "mongoose";

/** null/undefined pass; `required` handles presence. */
const isIntOrEmpty = (v: unknown): boolean => v === null || v === undefined || Number.isInteger(v);

/** Integer cents, ≥ 0 (docs/08 §6: money is integer cents, LKR). */
export const cents = (required = true): SchemaTypeOptions<number> => ({
  type: Number,
  required,
  min: 0,
  validate: { validator: isIntOrEmpty, message: "{PATH} must be an integer number of cents" },
});

export const intMin = (
  min: number,
  opts: { required?: boolean; default?: number; max?: number } = {},
): SchemaTypeOptions<number> => ({
  type: Number,
  min,
  ...(opts.max !== undefined ? { max: opts.max } : {}),
  required: opts.required ?? false,
  ...(opts.default !== undefined ? { default: opts.default } : {}),
  validate: { validator: isIntOrEmpty, message: "{PATH} must be an integer" },
});

export const ratingCache = new Schema(
  { average: { type: Number, default: 0, min: 0, max: 5 }, count: intMin(0, { default: 0 }) },
  { _id: false },
);

/** Options every collection uses (docs/08): timestamps + throw on unknown fields. */
export const baseOptions = { timestamps: true, strict: "throw" as const };

export const ref = (model: string, required = true): SchemaTypeOptions<Schema.Types.ObjectId> => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
