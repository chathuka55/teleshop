import mongoose, { type ClientSession, type Mongoose } from "mongoose";
import { getDbEnv } from "@/config/env";

/**
 * One cached Mongoose connection per process (survives Next.js hot reloads and serverless
 * reuse). Global settings from docs/10-security.md:
 *  - sanitizeFilter: strips `$`-operators from query filters built from user input
 *  - strictQuery: unknown filter paths are dropped
 * Not marked `server-only`: the db:* CLI scripts import it too.
 */

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);

type Cache = { conn: Mongoose | null; promise: Promise<Mongoose> | null; uri: string | null };
const g = globalThis as typeof globalThis & { __teleshopMongoose?: Cache };
const cache: Cache = (g.__teleshopMongoose ??= { conn: null, promise: null, uri: null });

export type ConnectOptions = { uri?: string; dbName?: string };

export async function connectDB(opts: ConnectOptions = {}): Promise<Mongoose> {
  // No explicit target: reuse whatever connection is already open (app, scripts, tests).
  if (!opts.uri && cache.conn) return cache.conn;
  if (!opts.uri && cache.promise) return cache.promise;
  const db = opts.uri ? null : getDbEnv();
  const uri = opts.uri ?? db?.MONGODB_URI ?? "";
  const dbName = opts.dbName ?? db?.MONGODB_DB ?? "teleshop";

  if (cache.conn && cache.uri === uri) return cache.conn;
  if (!cache.promise || cache.uri !== uri) {
    cache.uri = uri;
    cache.promise = mongoose.connect(uri, {
      dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      // Indexes are created by `pnpm db:indexes` / migrations in production, never at runtime.
      autoIndex: (db?.NODE_ENV ?? process.env.NODE_ENV) !== "production",
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
  cache.uri = null;
}

/**
 * Runs `fn` in a multi-document transaction (requires a replica set: Atlas, or
 * MongoMemoryReplSet in tests). The driver retries `fn` on transient errors, so keep it
 * free of side effects outside the database — send emails after it returns.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
