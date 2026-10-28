import "./load-env";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "@/db/mongoose";
import { setPasswords } from "./set-password-db";

const USAGE = `Usage:
  pnpm db:set-password <email> [<email> …]   new random password for these accounts
  pnpm db:set-password --sellers             new random password for every seller account`;

/**
 * pnpm db:set-password — gives accounts a new random password, prints it once, clears the
 * 5-failure lockout and signs out old sessions. For accounts nobody can reset by email (the
 * seeded @teleshop.local logins). Works on whatever database MONGODB_URI / MONGODB_DB point at.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const sellers = args.includes("--sellers");
  const emails = args.filter((a) => !a.startsWith("--"));
  if (sellers === emails.length > 0) throw new Error(USAGE);

  await connectDB();
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  const { updated, notFound } = await setPasswords(sellers ? { role: "seller" } : { emails });
  for (const u of updated) {
    const who = u.shop ? `${u.shop.shopName} (${u.shop.approvalStatus})` : u.role;
    const warn = u.status === "suspended" ? "   ← suspended: sign-in stays blocked" : "";
    console.log(`  ${who.padEnd(32)} ${u.email.padEnd(36)} ${u.password}${warn}`);
  }
  for (const e of notFound) console.log(`  not found: ${e}`);
  if (updated.length === 0) {
    process.exitCode = 1;
    return;
  }
  console.log("\nNew passwords (shown once — save them). Old sessions for these accounts are signed out.");
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
