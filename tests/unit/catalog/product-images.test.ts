import { describe, expect, it } from "vitest";
import { productImagesBySlug } from "@/config/product-images";
import { productImages } from "@/db/repositories/catalog-mappers";

const slug = "apple-iphone-17-pro";
const set = productImagesBySlug().get(slug) ?? [];

describe("productImages (photos before / after migration 0005)", () => {
  it("serves the photo set instead of the removed legacy single photo", () => {
    const shown = productImages({ slug, images: [{ url: `/images/products/${slug}.webp`, alt: "" }] });
    expect(set.length).toBeGreaterThan(1);
    expect(shown.map((i) => i.url)).toEqual(set.map((i) => i.url));
    expect(shown[0]?.url).toBe(`/images/products/${slug}-1.webp`);
  });

  it("fills a seeded product that has no images", () => {
    expect(productImages({ slug, images: [] }).map((i) => i.url)).toEqual(set.map((i) => i.url));
  });

  it("never replaces seller uploads", () => {
    const upload = [{ url: "https://b65e2efccddc.blob.upstash.io/p/abc.webp", alt: "Front" }];
    expect(productImages({ slug, images: upload })).toBe(upload);
  });

  it("leaves products without a demo set as they are", () => {
    expect(productImages({ slug: "seller-own-product", images: [] })).toEqual([]);
  });
});
