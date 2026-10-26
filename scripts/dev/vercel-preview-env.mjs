#!/usr/bin/env node
/**
 * pnpm vercel:preview-env — one-time setup of Vercel's *Preview* environment so PR preview builds
 * stop failing with "Invalid environment variables" (docs/12 §2).
 *
 * - Previews use their own database (`teleshop_preview`) on the same Atlas cluster, so testing a
 *   PR never touches shop data. Fill it once with:  MONGODB_DB=teleshop_preview pnpm db:seed
 * - Previews get their own AUTH_SECRET and TOTP key (never the production ones).
 * - No AUTH_URL: with AUTH_TRUST_HOST=true Auth.js uses each preview's own URL.
 *
 * Reads the Vercel token from VERCEL_TOKEN or ~/.vercel-token, values from .env.local and the
 * project id from .vercel/project.json (`vercel link`). Prints variable names only, never values.
 * Safe to re-run: existing Preview values are overwritten (upsert).
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

const token = (
  process.env.VERCEL_TOKEN ??
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path in the home folder
  readFileSync(join(homedir(), ".vercel-token"), "utf8")
)
  .replace(/^\uFEFF/, "") // Notepad may save a byte-order mark
  .trim();
const { projectId, orgId } = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
const local = parseEnvFile(readFileSync(".env.local", "utf8"));
const random32 = () => randomBytes(32).toString("base64");

const preview = {
  MONGODB_URI: local.MONGODB_URI,
  MONGODB_DB: "teleshop_preview",
  AUTH_SECRET: random32(),
  TOTP_ENCRYPTION_KEY: random32(),
  AUTH_TRUST_HOST: "true",
  UPSTASH_REDIS_REST_URL: local.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: local.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_BLOB_TOKEN: local.UPSTASH_BLOB_TOKEN,
};

const url = `https://api.vercel.com/v10/projects/${projectId}/env?upsert=true&teamId=${orgId}`;
let failed = 0;
for (const [key, value] of Object.entries(preview)) {
  if (!value) {
    console.log(`skip  ${key} (not in .env.local)`);
    continue;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: ["preview"] }),
  });
  if (res.ok) console.log(`set   ${key} → Preview`);
  else {
    failed++;
    console.log(`FAIL  ${key} → HTTP ${res.status}`);
  }
}
console.log(
  failed
    ? `\n${failed} variable(s) failed — check the token.`
    : "\nDone. Redeploy a preview (or push to a PR) to build with them.",
);
process.exitCode = failed ? 1 : 0;
