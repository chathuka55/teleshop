import mongoose from "mongoose";

/**
 * Query operators WE write, marked trusted. `sanitizeFilter` (src/db/mongoose.ts) neutralises
 * every `$`-object in a filter — including query-builder ones — so legitimate operators must be
 * wrapped. Only pass values that are already validated (Zod) or come from our own data.
 */
export const $in = <T>(values: readonly T[]) => mongoose.trusted({ $in: [...values] });
export const $nin = <T>(values: readonly T[]) => mongoose.trusted({ $nin: [...values] });
export const $ne = <T>(value: T) => mongoose.trusted({ $ne: value });
export const $gt = (value: number | Date) => mongoose.trusted({ $gt: value });
export const $gte = (value: number | Date) => mongoose.trusted({ $gte: value });
export const $lt = (value: number | Date) => mongoose.trusted({ $lt: value });
export const $lte = (value: number | Date) => mongoose.trusted({ $lte: value });
/** Field present / absent. Note: `{ field: "" }` or `{ field: [] }` never matches a MISSING field. */
export const $exists = (present: boolean) => mongoose.trusted({ $exists: present });
