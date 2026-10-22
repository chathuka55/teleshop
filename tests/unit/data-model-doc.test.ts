import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P1-T08: docs/08-data-model.md must list every collection and migration in the code.
 * Removing a row from the doc (or adding a model without documenting it) fails this test.
 */
const root = join(__dirname, "..", "..");
const doc = readFileSync(join(root, "docs", "08-data-model.md"), "utf8");
const modelsDir = join(root, "src", "db", "models");
const migrationsDir = join(root, "src", "db", "migrations");

const modelFiles = readdirSync(modelsDir).filter((f) => f.endsWith(".model.ts"));
const collections = modelFiles.map((file) => {
  const src = readFileSync(join(modelsDir, file), "utf8");
  // model<Doc>("Name", schema, "collection_name")
  const m = /model<\w+>\(\s*"\w+",\s*\w+,\s*"([a-z_]+)"\s*\)/.exec(src);
  return { file, collection: m?.[1] };
});
const migrationFiles = readdirSync(migrationsDir).filter((f) => /^\d{4}-[\w-]+\.ts$/.test(f));

describe("docs/08-data-model.md stays in sync with the code (P1-T08)", () => {
  it("finds the models and migrations", () => {
    expect(modelFiles.length).toBeGreaterThanOrEqual(21);
    expect(migrationFiles.length).toBeGreaterThanOrEqual(3);
  });

  it.each(collections)("$file declares an explicit collection name", ({ collection }) => {
    expect(collection).toBeTruthy();
  });

  it.each(collections)("collection `$collection` is documented in §3", ({ collection }) => {
    const section3 = doc.slice(doc.indexOf("## 3."), doc.indexOf("## 4."));
    expect(section3).toContain(`\`${collection}\``);
  });

  it.each(migrationFiles)("migration %s is in the §7 migration log", (file) => {
    const section7 = doc.slice(doc.indexOf("## 7."), doc.indexOf("## 8."));
    expect(section7).toContain(`\`${file}\``);
  });
});
