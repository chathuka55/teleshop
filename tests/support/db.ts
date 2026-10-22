import { afterAll, beforeAll, inject } from "vitest";
import { connectDB, disconnectDB } from "@/db/mongoose";

/** Connects this test file to its own database on the shared in-memory replica set. */
export function connectTestDatabase(name: string): void {
  beforeAll(async () => {
    const base = new URL(inject("mongoBaseUri"));
    base.pathname = `/${name}`;
    await connectDB({ uri: base.toString(), dbName: name });
  });
  afterAll(async () => {
    await disconnectDB();
  });
}
