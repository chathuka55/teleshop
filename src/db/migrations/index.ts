import type { Connection } from "mongoose";
import { migration as m0001 } from "./0001-init";
import { migration as m0002 } from "./0002-validators";
import { migration as m0003 } from "./0003-seed-couriers-settings";
import type { Migration } from "./types";

/** Every migration, in order. Add new files here AND in docs/08 §7 (the doc-sync test checks). */
export const migrations: readonly Migration[] = [m0001, m0002, m0003];

const LOG = "_migrations";

type Applied = { _id: string; appliedAt: Date; description: string };

export async function appliedMigrations(conn: Connection): Promise<Applied[]> {
  const db = conn.db;
  if (!db) throw new Error("No database handle");
  return db.collection<Applied>(LOG).find().sort({ _id: 1 }).toArray();
}

/** Apply pending migrations in order. Returns the ids that ran. */
export async function migrateUp(
  conn: Connection,
  log: (msg: string) => void = () => undefined,
): Promise<string[]> {
  const db = conn.db;
  if (!db) throw new Error("No database handle");
  const done = new Set((await appliedMigrations(conn)).map((m) => m._id));
  const ran: string[] = [];
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    log(`↑ ${m.id} — ${m.description}`);
    await m.up(conn);
    await db
      .collection<Applied>(LOG)
      .insertOne({ _id: m.id, appliedAt: new Date(), description: m.description });
    ran.push(m.id);
  }
  return ran;
}

/** Roll back one migration by id (e.g. "0003" or "0003-seed-couriers-settings"). */
export async function migrateDown(
  conn: Connection,
  idOrPrefix: string,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  const db = conn.db;
  if (!db) throw new Error("No database handle");
  const m = migrations.find((x) => x.id === idOrPrefix || x.id.startsWith(`${idOrPrefix}-`));
  if (!m) throw new Error(`Unknown migration: ${idOrPrefix}`);
  log(`↓ ${m.id}`);
  await m.down(conn);
  await db.collection<Applied>(LOG).deleteOne({ _id: m.id });
}
