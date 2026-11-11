import "./load-env";
import { connectDB, disconnectDB } from "@/db/mongoose";
import { demoSalesExist, removeDemoSales, seedDemoSales } from "./demo-sales-db";

/**
 * pnpm db:demo-sales            add months of demo sales history (portfolio showcase)
 * pnpm db:demo-sales --remove   take it all out again (stock reservations + ratings restored)
 *
 * Writes to the database in MONGODB_URI. Against Atlas (mongodb+srv / *.mongodb.net) it also
 * needs --yes, so it can't hit the live store by accident. See scripts/seed/README.md.
 */
async function main(): Promise<void> {
  if (process.env.VERCEL_ENV === "production")
    throw new Error("Run this from a laptop, not in a deployment.");
  const uri = process.env.MONGODB_URI ?? "";
  const remote = uri.startsWith("mongodb+srv://") || uri.includes(".mongodb.net");
  if (remote && !process.argv.includes("--yes")) {
    throw new Error(
      "MONGODB_URI is an Atlas cluster (the live store?). Re-run with --yes if that is intended.",
    );
  }
  await connectDB();

  if (process.argv.includes("--remove")) {
    const removed = await removeDemoSales();
    console.log(Object.keys(removed).length ? "Removed demo sales:" : "No demo sales to remove.", removed);
    return;
  }
  if (await demoSalesExist())
    throw new Error("Demo sales are already in this database (use --remove first).");
  console.log("Adding demo sales history…");
  const { counts, window } = await seedDemoSales();
  console.log(`Window: ${window.from.toISOString().slice(0, 10)} → ${window.to.toISOString().slice(0, 10)}`);
  console.log(
    Object.entries(counts)
      .map(([k, n]) => `${k}=${n}`)
      .join(" · "),
  );
}

main()
  .catch((e: unknown) => {
    console.error("Demo sales failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
