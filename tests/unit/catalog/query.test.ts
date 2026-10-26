import { describe, expect, it } from "vitest";
import { parseProductQuery } from "@/modules/catalog/schema";

describe("parseProductQuery", () => {
  it("parses filters from search params and converts rupees to cents", () => {
    const q = parseProductQuery({ brand: "Apple,Sony", min: "100000", max: "400000", sort: "price_asc" });
    expect(q.brand).toEqual(["apple", "sony"]);
    expect(q.minPriceCents).toBe(10_000_000);
    expect(q.maxPriceCents).toBe(40_000_000);
    expect(q.sort).toBe("price_asc");
  });

  it("drops invalid values instead of trusting them", () => {
    const q = parseProductQuery({
      sort: "$where",
      min: "-5",
      condition: "new,broken",
      cursor: "{$gt:1}",
      seller: "../../etc",
    });
    expect(q.sort).toBe("featured");
    expect(q.minPriceCents).toBeUndefined();
    expect(q.condition).toBeUndefined();
    expect(q.cursor).toBeUndefined();
    expect(q.seller).toBeUndefined();
  });

  it("takes the first value of repeated params", () => {
    expect(parseProductQuery({ q: ["iphone", "samsung"] }).q).toBe("iphone");
  });

  it("joins repeated checkbox params from the filter form", () => {
    const q = parseProductQuery({ brand: ["apple", "sony"], condition: ["new", "refurbished"] });
    expect(q.brand).toEqual(["apple", "sony"]);
    expect(q.condition).toEqual(["new", "refurbished"]);
  });

  it("ignores empty price inputs instead of treating them as 0", () => {
    const q = parseProductQuery({ min: "", max: "" });
    expect(q.minPriceCents).toBeUndefined();
    expect(q.maxPriceCents).toBeUndefined();
  });
});

describe("spec filters (P3-T04)", () => {
  const filters = [
    { key: "storage", label: "Storage", options: ["128GB", "256GB", "512GB", "1TB"] },
    { key: "ram", label: "RAM", options: ["8GB", "12GB", "16GB"] },
  ];

  it("keeps only listed options of the category's filterable specs", () => {
    const q = parseProductQuery(
      { "spec.storage": ["256GB", "512GB,1TB"], "spec.ram": "16GB", "spec.colour": "Red" },
      "mobile-phones",
      filters,
    );
    expect(q.specs).toEqual({ storage: ["256GB", "512GB", "1TB"], ram: ["16GB"] });
  });

  it("drops anything user-typed that isn't an option", () => {
    const q = parseProductQuery({ "spec.storage": "$where,.*,256GB", "spec.ram": "{$gt:''}" }, "x", filters);
    expect(q.specs).toEqual({ storage: ["256GB"] });
    expect(parseProductQuery({ "spec.storage": "999TB" }, "x", filters).specs).toBeUndefined();
  });

  it("is ignored without the category's filter list (e.g. /shop)", () => {
    expect(parseProductQuery({ "spec.storage": "256GB" }).specs).toBeUndefined();
  });

  it("round-trips through listingHref", async () => {
    const { listingHref } = await import("@/components/product/ProductListing");
    const q = parseProductQuery({ "spec.storage": "256GB,512GB", sort: "price_asc" }, "x", filters);
    const href = listingHref("/c/mobile-phones", q);
    expect(href).toBe("/c/mobile-phones?sort=price_asc&spec.storage=256GB%2C512GB");
    const back = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseProductQuery(back, "x", filters).specs).toEqual(q.specs);
  });
});
