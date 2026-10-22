import { mkdirSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * pnpm db:memory — local MongoDB replica set for development without Atlas or Docker.
 * Data persists in `.mongo-dev/` between runs. Point the app at it with:
 *   MONGODB_URI=mongodb://127.0.0.1:27027/teleshop?replicaSet=rs0 pnpm dev
 */
const PORT = Number(process.env.MEMORY_DB_PORT ?? 27027);
const dbPath = ".mongo-dev";

async function main(): Promise<void> {
  mkdirSync(dbPath, { recursive: true });
  const rs = await MongoMemoryReplSet.create({
    replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ port: PORT, dbPath, launchTimeout: 60_000 }],
  });
  const uri = `mongodb://127.0.0.1:${PORT}/teleshop?replicaSet=rs0`;
  console.log(`Local MongoDB replica set ready: ${uri}`);
  console.log(`Data dir: ${dbPath}/  ·  Ctrl+C to stop`);

  const stop = async (): Promise<void> => {
    await rs.stop({ doCleanup: false, force: false });
    process.exit(0);
  };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
  setInterval(() => undefined, 1 << 30); // keep alive
}

main().catch((e: unknown) => {
  console.error("Could not start local MongoDB:", e instanceof Error ? e.message : e);
  process.exit(1);
});
