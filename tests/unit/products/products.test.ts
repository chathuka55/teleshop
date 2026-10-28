import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { InvalidImageError } from "@/lib/images/avatar";
import { PRODUCT_IMAGE_MAX, processProductImage } from "@/lib/images/product";
import {
  canProductAction,
  cleanSpecs,
  makeSku,
  priceChangeNeedsReview,
  slugify,
  statusAfterEdit,
  variantAttributeKeys,
} from "@/modules/products/access";
import { lkrPrice, productInputSchema, variantLabel } from "@/modules/products/schema";
import type { SpecFieldDTO } from "@/modules/products/types";

const template: SpecFieldDTO[] = [
  { key: "storage", label: "Storage", type: "select", unit: null, options: ["128GB", "256GB"] },
  { key: "battery", label: "Battery", type: "number", unit: "mAh", options: [] },
  { key: "chip", label: "Chip", type: "text", unit: null, options: [] },
];

describe("prices in rupees → cents", () => {
  it.each([
    ["389900", 38_990_000],
    ["389,900", 38_990_000],
    ["389900.5", 38_990_050],
    ["0.99", 99],
  ])("%s → %d", (input, cents) => expect(lkrPrice.parse(input)).toBe(cents));
  it.each(["0", "", "abc", "1.234", "1.2.3", "-5", "123456789"])("rejects %s", (input) => {
    expect(lkrPrice.safeParse(input).success).toBe(false);
  });
});

describe("price changes over 20 % go back to review", () => {
  const before = [
    { sku: "A", priceCents: 100_000 },
    { sku: "B", priceCents: 200_000 },
  ];
  it("compares each existing variant with its old price", () => {
    expect(priceChangeNeedsReview(before, [{ sku: "A", priceCents: 119_000 }])).toBe(false);
    expect(priceChangeNeedsReview(before, [{ sku: "A", priceCents: 121_000 }])).toBe(true);
    expect(priceChangeNeedsReview(before, [{ sku: "B", priceCents: 159_000 }])).toBe(true);
  });
  it("checks a new variant against the old price range", () => {
    expect(priceChangeNeedsReview(before, [{ sku: "C", priceCents: 150_000 }])).toBe(false);
    expect(priceChangeNeedsReview(before, [{ sku: "C", priceCents: 250_000 }])).toBe(true);
    expect(priceChangeNeedsReview(before, [{ sku: "C", priceCents: 70_000 }])).toBe(true);
  });
  it("only changes the status of live products", () => {
    expect(statusAfterEdit("published", true)).toBe("pending_review");
    expect(statusAfterEdit("published", false)).toBe("published");
    expect(statusAfterEdit("inactive", true)).toBe("pending_review");
    expect(statusAfterEdit("draft", true)).toBe("draft");
  });
  it("allows status changes only from the right states", () => {
    expect(canProductAction("submit", "draft")).toBe(true);
    expect(canProductAction("submit", "published")).toBe(false);
    expect(canProductAction("deactivate", "published")).toBe(true);
    expect(canProductAction("reactivate", "blocked")).toBe(false);
  });
});

describe("specs follow the category template", () => {
  it("keeps known keys, checks select options and numbers, drops the rest", () => {
    const r = cleanSpecs(template, {
      storage: "256GB",
      battery: "4500",
      chip: " A19 ",
      hack: "x",
      $where: "1",
    });
    expect(r).toEqual({ specs: { storage: "256GB", battery: "4500", chip: "A19" }, errors: {} });
    const bad = cleanSpecs(template, { storage: "2TB", battery: "lots" });
    expect(Object.keys(bad.errors)).toEqual(["storage", "battery"]);
  });
  it("lets variants vary by the select fields and colour", () => {
    expect(variantAttributeKeys(template)).toEqual(["storage", "colour"]);
    expect(variantLabel({ label: "", attributes: { storage: "256GB", colour: "Silver" } })).toBe(
      "256GB / Silver",
    );
  });
});

describe("slugs and SKUs", () => {
  it("builds URL-safe slugs and valid SKUs", () => {
    expect(slugify("Apple iPhone 17 Pro (256GB) — Silver!")).toBe("apple-iphone-17-pro-256gb-silver");
    const sku = makeSku("iPhone 17 Pro", "256GB / Silver", "a1b2");
    expect(sku).toBe("IPHONE-17-PRO-256GB-SILVER-A1B2");
    expect(sku).toMatch(/^[A-Z0-9-]{2,64}$/);
    expect(makeSku("x".repeat(80), "y".repeat(80), "ffff").length).toBeLessThanOrEqual(64);
  });
});

describe("productInputSchema", () => {
  const base = {
    categoryId: "a".repeat(24),
    brandId: "b".repeat(24),
    name: "Apple iPhone 17 Pro",
    shortName: "iPhone 17 Pro",
    condition: "new",
    shortDescription: "",
    description: "",
    warrantyMonths: "12",
    warrantyType: "manufacturer",
    variants: [{ sku: "", label: "256GB", price: "389900", compareAt: "", stock: "3" }],
  };
  it("accepts a minimal product", () => expect(productInputSchema.safeParse(base).success).toBe(true));
  it("rejects duplicate SKUs and labels, and a lower 'was' price", () => {
    const dup = productInputSchema.safeParse({
      ...base,
      variants: [
        { sku: "X-1", label: "A", price: "1" },
        { sku: "X-1", label: "B", price: "1" },
      ],
    });
    expect(dup.error?.issues.some((i) => i.message === "Each variant needs its own SKU")).toBe(true);
    const was = productInputSchema.safeParse({
      ...base,
      variants: [{ sku: "", label: "A", price: "100", compareAt: "90" }],
    });
    expect(was.error?.issues[0]?.path).toEqual(["variants", 0, "compareAt"]);
  });
  it("needs a category and brand", () => {
    const r = productInputSchema.safeParse({ ...base, categoryId: "", brandId: "" });
    expect(r.error?.issues.map((i) => i.message)).toEqual(["Choose a category", "Choose a brand"]);
  });
});

describe("processProductImage", () => {
  const photo = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 90, b: 30 } } })
      .withExif({ IFD0: { Copyright: "secret" } })
      .jpeg()
      .toBuffer();

  it("shrinks big photos to 1600 px, keeps the shape, drops EXIF", async () => {
    const out = await processProductImage(await photo(4000, 2000));
    expect([out.width, out.height]).toEqual([PRODUCT_IMAGE_MAX, 800]);
    const meta = await sharp(out.bytes).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });
  it("never upscales small photos", async () => {
    const out = await processProductImage(await photo(600, 600));
    expect([out.width, out.height]).toEqual([600, 600]);
  });
  it("refuses non-photos", async () => {
    await expect(processProductImage(new TextEncoder().encode("<svg/>"))).rejects.toBeInstanceOf(
      InvalidImageError,
    );
  });
});
