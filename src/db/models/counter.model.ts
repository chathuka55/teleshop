import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** `_id` = counter name (e.g. `order:2026`). Atomic `$inc` gives order numbers TS-2026-000123. */
const counterSchema = new Schema(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { strict: "throw", versionKey: false },
);

export type CounterDoc = InferSchemaType<typeof counterSchema>;
export const CounterModel =
  (models.Counter as Model<CounterDoc> | undefined) ??
  model<CounterDoc>("Counter", counterSchema, "counters");
