import { productImagesBySlug } from "@/config/product-images";
import { ProductModel } from "../models/product.model";
import type { Migration } from "./types";

/**
 * Attach the Wikimedia Commons demo photos (public/images/products, credits on /credits) to the
 * seeded products — up to 4 per product, main photo first. Only products without images are
 * touched, so seller uploads are never replaced.
 */
export const migration: Migration = {
  id: "0004-demo-product-images",
  description: "Demo product photos for seeded products",
  async up() {
    for (const [slug, images] of productImagesBySlug()) {
      // Plain equality (no operator): matches only an empty `images` array.
      await ProductModel.updateOne({ slug, images: [] }, { $set: { images } });
    }
  },
  async down() {
    for (const [slug, images] of productImagesBySlug()) {
      for (const { url } of images) {
        await ProductModel.updateOne({ slug }, { $pull: { images: { url } } });
      }
    }
  },
};
