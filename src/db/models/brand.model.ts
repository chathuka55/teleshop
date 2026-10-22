import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions } from "./_shared";

const brandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{1,60}$/ },
    logoUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  baseOptions,
);

export type BrandDoc = InferSchemaType<typeof brandSchema>;
export const BrandModel =
  (models.Brand as Model<BrandDoc> | undefined) ?? model<BrandDoc>("Brand", brandSchema, "brands");
