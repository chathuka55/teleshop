import { productImagesBySlug } from "@/config/product-images";
import { ProductModel } from "../models/product.model";
import type { Migration } from "./types";
import { $in } from "../operators";

/** The single demo photo URL the first version of 0004 stored (file renamed to `<slug>-1.webp`). */
const legacyUrl = (slug: string): string => `/images/products/${slug}.webp`;

/**
 * 0004 ran on Atlas while it still attached ONE photo per product as `<slug>.webp`. Those files
 * were replaced by photo sets (`<slug>-1…4.webp`, backgrounds removed), so the old URLs 404.
 * Replaces the legacy demo photo (or an empty list) with the full set — products with any other
 * image (seller uploads) are left alone.
 */
export const migration: Migration = {
  id: "0005-demo-product-photo-sets",
  description: "Replace legacy single demo photos with photo sets",
  async up() {
    for (const [slug, images] of productImagesBySlug()) {
      await ProductModel.updateOne({ slug, "images.url": $in([legacyUrl(slug)]) }, { $set: { images } });
      // Plain equality (no operator): matches only an empty `images` array.
      await ProductModel.updateOne({ slug, images: [] }, { $set: { images } });
    }
  },
  async down() {
    for (const [slug, images] of productImagesBySlug()) {
      const first = images[0];
      if (!first) continue;
      await ProductModel.updateOne(
        { slug, "images.url": $in([first.url]) },
        { $set: { images: [{ ...first, url: legacyUrl(slug) }] } },
      );
    }
  },
};
