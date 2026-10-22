import { defaultCouriers } from "@/config/couriers";
import { CourierModel } from "../models/courier.model";
import { SettingsModel } from "../models/settings.model";
import type { Migration } from "./types";
import { $in } from "../operators";

/** Insert the four couriers and `settings.global` — only if missing, never overwriting admin edits. */
export const migration: Migration = {
  id: "0003-seed-couriers-settings",
  description: "Insert couriers + settings.global",
  async up() {
    for (const c of defaultCouriers) {
      await CourierModel.updateOne(
        { name: c.name },
        { $setOnInsert: { ...c, isActive: true } },
        { upsert: true },
      );
    }
    await SettingsModel.updateOne(
      { _id: "global" },
      { $setOnInsert: { _id: "global" } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  },
  async down() {
    await CourierModel.deleteMany({ name: $in(defaultCouriers.map((c) => c.name)) });
    await SettingsModel.deleteOne({ _id: "global" });
  },
};
