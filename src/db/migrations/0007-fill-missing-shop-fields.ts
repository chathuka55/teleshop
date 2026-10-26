import { demoShopPhotos, demoShopProfiles } from "@/config/demo-shops";
import { SellerModel } from "../models/seller.model";
import type { Migration } from "./types";
import { $exists } from "../operators";

/**
 * Follow-up to 0006: shop records created before v0.3 have NO `photos` / `openingHours` field at
 * all, and 0006's `{ photos: [] }` / `{ openingHours: "" }` filters never match a missing field —
 * so on Atlas the demo shops got cover + pin + description but no gallery or hours. This fills
 * those two fields when they are missing (or still empty); a seller's own values are kept.
 */
export const migration: Migration = {
  id: "0007-fill-missing-shop-fields",
  description: "Fill shop photos + opening hours where the field is missing",
  async up() {
    const photos = demoShopPhotos();
    for (const [slug, profile] of Object.entries(demoShopProfiles)) {
      const set = photos.get(slug) ?? [];
      for (const filter of [{ photos: $exists(false) }, { photos: [] }]) {
        await SellerModel.updateOne({ slug, ...filter }, { $set: { photos: set } });
      }
      for (const filter of [{ openingHours: $exists(false) }, { openingHours: "" }]) {
        await SellerModel.updateOne({ slug, ...filter }, { $set: { openingHours: profile.openingHours } });
      }
    }
  },
  async down() {
    // Nothing to undo safely: 0006's down() already clears these demo fields.
  },
};
