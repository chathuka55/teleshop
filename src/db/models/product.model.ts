import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseOptions, cents, intMin, ratingCache, ref } from "./_shared";

const variantSchema = new Schema({
  /** = inventory.sku (unique across all products) */
  sku: { type: String, required: true, match: /^[A-Z0-9-]{2,64}$/ },
  label: { type: String, required: true, maxlength: 80 },
  /** storage, ram, colour, size… */
  attributes: { type: Map, of: String, default: () => new Map() },
  priceCents: cents(),
  compareAtCents: { ...cents(false), default: null },
  imageUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
});

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    width: intMin(1),
    height: intMin(1),
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    sellerId: ref("Seller"),
    categoryId: ref("Category"),
    brandId: ref("Brand"),
    name: { type: String, required: true, trim: true, maxlength: 140 },
    /** compact name for phone cards and cart lines, e.g. "iPhone 17 Pro 256GB" */
    shortName: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9-]{2,120}$/ },
    shortDescription: { type: String, default: "", maxlength: 300 },
    /** plain text (rendered escaped; sellers can't post HTML) */
    description: { type: String, default: "", maxlength: 10_000 },
    highlights: {
      type: [{ type: String, maxlength: 60 }],
      default: [],
      validate: (v: string[]) => v.length <= 6,
    },
    condition: { type: String, enum: ["new", "used", "refurbished"], default: "new", required: true },
    /** keys from the category specTemplate, validated in the service */
    specs: { type: Map, of: String, default: () => new Map() },
    images: { type: [imageSchema], default: [], validate: (v: unknown[]) => v.length <= 8 },
    variants: {
      type: [variantSchema],
      validate: [
        { validator: (v: unknown[]) => v.length >= 1 && v.length <= 50, message: "1–50 variants" },
        {
          validator: (v: { sku: string }[]) => new Set(v.map((x) => x.sku)).size === v.length,
          message: "Duplicate SKU in product",
        },
      ],
    },
    /** lowest active variant price (cached for sorting) */
    basePriceCents: cents(),
    freeDelivery: { type: Boolean, default: false },
    warranty: {
      type: new Schema(
        {
          months: intMin(0, { default: 0, max: 120 }),
          type: { type: String, enum: ["manufacturer", "shop", "none"], default: "none" },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "inactive", "blocked"],
      default: "draft",
      required: true,
    },
    rating: { type: ratingCache, default: () => ({}) },
    publishedAt: { type: Date, default: null },
  },
  baseOptions,
);

productSchema.index({ "variants.sku": 1 }, { unique: true });
productSchema.index({ status: 1, categoryId: 1, basePriceCents: 1 });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ name: "text", "specs.model": "text" }, { weights: { name: 10 }, name: "product_text" });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const ProductModel =
  (models.Product as Model<ProductDoc> | undefined) ??
  model<ProductDoc>("Product", productSchema, "products");
