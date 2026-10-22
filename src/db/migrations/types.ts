import type { Connection } from "mongoose";

/**
 * A data migration (docs/08 §8). `up` and `down` MUST be idempotent — safe to run twice.
 * Applied ids are recorded in the `_migrations` collection by `scripts/seed/migrate.ts`.
 */
export type Migration = {
  id: string;
  description: string;
  up: (conn: Connection) => Promise<void>;
  down: (conn: Connection) => Promise<void>;
};
