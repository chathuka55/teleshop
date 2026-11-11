import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODEL_BUDGET, routeFiles } from "../../../scripts/perf/budgets.mjs";

describe("performance budgets (P8-T02)", () => {
  it("counts the root chunks, every layout above the page and the page", () => {
    const pages = {
      "/layout": ["static/chunks/main.js", "static/css/app.css"],
      "/(store)/layout": ["static/chunks/main.js", "static/chunks/store.js"],
      "/(store)/p/[slug]/layout": ["static/chunks/p-layout.js"],
      "/(store)/p/[slug]/page": ["static/chunks/product.js"],
      "/admin/layout": ["static/chunks/admin.js"],
    };
    expect(routeFiles(pages, "/(store)/p/[slug]/page").sort()).toEqual([
      "static/chunks/main.js",
      "static/chunks/p-layout.js",
      "static/chunks/product.js",
      "static/chunks/store.js",
    ]);
    // CSS is not JS; sibling sections (admin) are not part of the store page.
    expect(routeFiles(pages, "/(store)/p/[slug]/page")).not.toContain("static/chunks/admin.js");
  });

  it("keeps every hero model at or under 2.5 MB (docs/06 §2)", () => {
    const dir = "public/models";
    const models = readdirSync(dir).filter((f) => f.endsWith(".glb"));
    expect(models.length).toBeGreaterThan(0);
    for (const name of models) {
      expect(statSync(join(dir, name)).size, name).toBeLessThanOrEqual(MODEL_BUDGET);
    }
  });
});
