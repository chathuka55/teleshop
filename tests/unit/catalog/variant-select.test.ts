import { describe, expect, it } from "vitest";
import { defaultVariant, optionGroups, selectVariant } from "@/components/product/variant-select";
import { fixtureProducts } from "../../fixtures/products";

const demoProducts = fixtureProducts();

const iphone = demoProducts.find((p) => p.slug === "apple-iphone-17-pro");
if (!iphone) throw new Error("fixture missing");
const variants = iphone.variants;

describe("variant selection", () => {
  it("lists only attributes that vary", () => {
    const groups = optionGroups(variants);
    expect(groups.map((g) => g.key)).toEqual(["storage", "colour"]);
    expect(groups[0]?.values).toEqual(["256GB", "512GB"]);
  });

  it("defaults to the cheapest in-stock variant", () => {
    expect(defaultVariant(variants)?.priceCents).toBe(38_990_000);
    expect(defaultVariant(variants)?.inStock).toBe(true);
  });

  it("keeps the other choice when that combination exists", () => {
    const orange256 = variants.find((v) => v.sku === "IP17P-256-ORG");
    if (!orange256) throw new Error("fixture missing");
    expect(selectVariant(variants, orange256, "storage", "512GB").sku).toBe("IP17P-512-ORG");
  });

  it("falls back to an in-stock variant with the chosen value", () => {
    const silver256 = variants.find((v) => v.sku === "IP17P-256-SLV");
    if (!silver256) throw new Error("fixture missing");
    // 512GB Silver does not exist → prefer the in-stock 512GB Orange over sold-out 512GB Blue
    expect(selectVariant(variants, silver256, "storage", "512GB").sku).toBe("IP17P-512-ORG");
  });
});
