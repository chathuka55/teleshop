import "./load-env";
import { connectDB, disconnectDB } from "@/db/mongoose";
import { OrderModel } from "@/db/models";
import { seedDatabase } from "./seed-db";
import { $ne } from "@/db/operators";

/**
 * pnpm db:seed — development data. Refuses to run in production, and refuses to wipe a
 * database that holds real orders (anything besides the demo order) unless --force.
 * SEED_PASSWORD=… gives every account that password (end-to-end tests: E2E_PASSWORD).
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV/VERCEL_ENV is production.");
  }
  await connectDB();
  // Trusted operator: a plain `{ $ne }` would be neutralised by sanitizeFilter.
  const realOrders = await OrderModel.countDocuments({ idempotencyKey: $ne("seed-demo-order") });
  if (realOrders > 0 && !process.argv.includes("--force")) {
    throw new Error(`Refusing to seed: ${realOrders} real order(s) found. Re-run with --force to wipe them.`);
  }

  const fixedPassword = process.env.SEED_PASSWORD || undefined;
  if (fixedPassword && fixedPassword.length < 10)
    throw new Error("SEED_PASSWORD needs at least 10 characters.");

  console.log("Seeding… (wipes users, sellers, catalogue, carts, orders and payouts)");
  const { accounts, counts } = await seedDatabase({ fixedPassword });
  console.log(
    "\nCollections:",
    Object.entries(counts)
      .map(([k, n]) => `${k}=${n}`)
      .join(" · "),
  );
  console.log("\nDevelopment accounts (shown once — save them):");
  for (const a of accounts) console.log(`  ${a.role.padEnd(28)} ${a.email.padEnd(34)} ${a.password}`);
  console.log("\nDemo order for /track: TS-2026-000123 + 077 123 4567");
}

main()
  .catch((e: unknown) => {
    console.error("Seed failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
