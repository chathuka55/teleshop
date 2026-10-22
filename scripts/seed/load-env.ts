/**
 * Loads `.env.local` (then `.env`) for the db:* CLI scripts, the same files Next.js reads.
 * Already-set environment variables win (CI passes MONGODB_URI directly).
 * Import this FIRST in every script.
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file missing — fine
  }
}

export {};
