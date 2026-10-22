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
