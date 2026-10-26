import { demoShopPhotos, demoShopProfiles } from "@/config/demo-shops";
import { SellerModel } from "../models/seller.model";
import type { Migration } from "./types";

/**
 * Shop-page extras for the demo sellers: cover + photos (Wikimedia Commons), map pin, opening
 * hours and description. Each field is only set where it is still empty, so a seller's own edits are never replaced.
 */
export const migration: Migration = {
  id: "0006-demo-shop-profiles",
  description: "Cover photo, photos, map pin and hours for demo shops",
  async up() {
    const photos = demoShopPhotos();
    for (const [slug, profile] of Object.entries(demoShopProfiles)) {
      const set = photos.get(slug) ?? [];
      // Plain equality filters (no operators): match only fields that are still empty.
      if (set[0]) await SellerModel.updateOne({ slug, coverUrl: null }, { $set: { coverUrl: set[0].url } });
      await SellerModel.updateOne({ slug, photos: [] }, { $set: { photos: set } });
      await SellerModel.updateOne({ slug, location: null }, { $set: { location: profile.location } });
      await SellerModel.updateOne(
        { slug, openingHours: "" },
        { $set: { openingHours: profile.openingHours } },
      );
      await SellerModel.updateOne({ slug, description: "" }, { $set: { description: profile.description } });
    }
  },
  async down() {
    for (const slug of Object.keys(demoShopProfiles)) {
      await SellerModel.updateOne(
        { slug },
        { $set: { coverUrl: null, photos: [], location: null, openingHours: "", description: "" } },
      );
    }
  },
};
