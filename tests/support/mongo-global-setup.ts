import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoBaseUri: string;
  }
}

/**
 * One in-memory replica set for the whole integration run (transactions need a replica set).
 * Tests never touch Atlas (docs/11 §3). Each test file uses its own database.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    // First launch of a freshly downloaded mongod can be slow (antivirus scan on Windows).
    instanceOpts: [{ launchTimeout: 60_000 }],
  });
  project.provide("mongoBaseUri", replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
