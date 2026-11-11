// Performance budgets (P8-T02, docs/11 §1). Run after `pnpm build`: `pnpm perf:budgets`.
//
// 1. First-load JS per app route, gzip: every page < 250 KB (docs/06 §6). Lazily loaded
//    chunks (the 3D hero, GSAP) are not in the route manifest, so they are excluded by design.
// 2. Every hero model in public/models ≤ 2.5 MB (docs/06 §2).
//
// Exits 1 when a budget is broken, so CI fails.
/* eslint-disable security/detect-non-literal-fs-filename -- only reads fixed repo folders (.next, public/models) */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

export const ROUTE_JS_BUDGET = 250 * 1024;
export const MODEL_BUDGET = 2.5 * 1024 * 1024;

/**
 * Files a browser downloads on first load of an app route: the root chunks plus every
 * layout above the page and the page itself. Polyfills are `nomodule` and skipped.
 * @param {Record<string, string[]>} pages app-build-manifest `pages`
 * @param {string} pageKey e.g. "/(store)/p/[slug]/page"
 * @returns {string[]}
 */
export function routeFiles(pages, pageKey) {
  const segments = pageKey
    .replace(/\/page$/, "")
    .split("/")
    .filter(Boolean);
  const keys = ["/layout"];
  for (let i = 1; i <= segments.length; i++) keys.push(`/${segments.slice(0, i).join("/")}/layout`);
  keys.push(pageKey);
  const files = new Set();
  for (const key of keys) for (const file of pages[key] ?? []) if (file.endsWith(".js")) files.add(file);
  return [...files];
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

function checkRoutes(nextDir) {
  const { pages } = JSON.parse(readFileSync(join(nextDir, "app-build-manifest.json"), "utf8"));
  const gzipCache = new Map();
  const gz = (file) => {
    if (!gzipCache.has(file))
      gzipCache.set(file, gzipSync(readFileSync(join(nextDir, file)), { level: 9 }).length);
    return gzipCache.get(file);
  };
  const rows = Object.keys(pages)
    .filter((key) => key.endsWith("/page"))
    .map((key) => ({ route: key, bytes: routeFiles(pages, key).reduce((sum, f) => sum + gz(f), 0) }))
    .sort((a, b) => b.bytes - a.bytes);

  console.log("First-load JS (gzip), largest first:");
  for (const { route, bytes } of rows.slice(0, 8)) console.log(`  ${kb(bytes).padStart(9)}  ${route}`);
  const home = rows.find((r) => r.route === "/(store)/page");
  if (home) console.log(`  home: ${kb(home.bytes)} of ${kb(ROUTE_JS_BUDGET)}`);
  return rows
    .filter((r) => r.bytes > ROUTE_JS_BUDGET)
    .map((r) => `${r.route}: ${kb(r.bytes)} > ${kb(ROUTE_JS_BUDGET)}`);
}

function checkModels(dir) {
  const failures = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".glb"))) {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > MODEL_BUDGET) failures.push(`${name}: ${kb(bytes)} > ${kb(MODEL_BUDGET)}`);
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = [...checkRoutes(".next"), ...checkModels("public/models")];
  if (failures.length) {
    console.error(`\nBudget exceeded:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nAll performance budgets met.");
}
