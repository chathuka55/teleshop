import "./load-env";
import { allModels } from "@/db/models";
import { connectDB, disconnectDB } from "@/db/mongoose";

/** pnpm db:indexes — make every collection's indexes match its model (creates missing, drops stale). */
async function main(): Promise<void> {
  await connectDB();
  for (const model of allModels) {
    const dropped = await model.syncIndexes();
    const count = (await model.listIndexes()).length;
    console.log(
      `${model.collection.collectionName.padEnd(22)} ${count} index(es)${dropped.length ? ` · dropped: ${dropped.join(", ")}` : ""}`,
    );
  }
}

main()
  .catch((e: unknown) => {
    console.error("Index sync failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
