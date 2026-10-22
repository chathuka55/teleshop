import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, intMin } from "./_shared";

const specFieldSchema = new Schema(
  {
    key: { type: String, required: true, match: /^[a-z][a-zA-Z0-9]{0,30}$/ },
    label: { type: String, required: true, maxlength: 40 },
    type: { type: String, enum: ["text", "number", "select"], default: "text" },
    unit: { type: String, default: null },
    options: { type: [String], default: [] },
    /** shown as a filter on /c/[slug] */
    filterable: { type: Boolean, default: false },
  },
  { _id: false },
);

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{2,60}$/ },
    /** null = main category */
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    /** UI icon key (Figma category tiles) */
    icon: {
      type: String,
      enum: ["phone", "laptop", "cpu", "headphones", "watch", "monitor", "gamepad", "wifi"],
      default: "phone",
    },
    specTemplate: { type: [specFieldSchema], default: [] },
    /** seller must record IMEI/serial before "ready to ship" */
    requiresSerial: { type: Boolean, default: false },
    imageUrl: { type: String, default: null },
    sortOrder: intMin(0, { default: 0 }),
    isActive: { type: Boolean, default: true },
  },
  baseOptions,
);
categorySchema.index({ parentId: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const CategoryModel =
  (models.Category as Model<CategoryDoc> | undefined) ??
  model<CategoryDoc>("Category", categorySchema, "categories");
