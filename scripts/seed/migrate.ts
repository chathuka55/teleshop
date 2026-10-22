import "./load-env";
import mongoose from "mongoose";
import { appliedMigrations, migrateDown, migrateUp, migrations } from "@/db/migrations";
import { connectDB, disconnectDB } from "@/db/mongoose";

/**
 * pnpm db:migrate               apply pending migrations
 * pnpm db:migrate --status      list applied / pending
 * pnpm db:migrate --down 0003   roll back one migration
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  await connectDB();
  const conn = mongoose.connection;

  if (args.includes("--status")) {
    const applied = new Map((await appliedMigrations(conn)).map((m) => [m._id, m.appliedAt]));
    for (const m of migrations) {
      const at = applied.get(m.id);
      console.log(`${at ? "✔" : "·"} ${m.id.padEnd(32)} ${at ? at.toISOString() : "pending"}`);
    }
    return;
  }

  const downIdx = args.indexOf("--down");
  if (downIdx !== -1) {
    const id = args[downIdx + 1];
    if (!id) throw new Error("Usage: pnpm db:migrate --down <id>");
    await migrateDown(conn, id, console.log);
    console.log("Done.");
    return;
  }

  const ran = await migrateUp(conn, console.log);
  console.log(ran.length ? `Applied ${ran.length} migration(s).` : "Nothing to migrate — up to date.");
}

main()
  .catch((e: unknown) => {
    console.error("Migration failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
