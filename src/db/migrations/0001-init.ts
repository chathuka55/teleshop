import { allModels } from "../models";
import type { Migration } from "./types";

/** Create every collection and all indexes from §3 (including TTL indexes). */
export const migration: Migration = {
  id: "0001-init",
  description: "Create collections, all indexes, TTL indexes",
  async up() {
    for (const model of allModels) {
      await model.createCollection().catch((e: { codeName?: string }) => {
        if (e.codeName !== "NamespaceExists") throw e;
      });
      await model.createIndexes();
    }
  },
  async down() {
    // Drops secondary indexes only — never data.
    for (const model of allModels) {
      await model.collection.dropIndexes().catch(() => undefined);
    }
  },
};
