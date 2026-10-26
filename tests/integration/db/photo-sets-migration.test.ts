import { beforeAll, describe, expect, it } from "vitest";
import { ProductModel } from "@/db/models";
import { migration } from "@/db/migrations/0005-demo-product-photo-sets";
import { productImagesBySlug } from "@/config/product-images";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_photo_sets");

const sets = productImagesBySlug();
const [legacySlug, emptySlug, sellerSlug] = [...sets.keys()];
const urls = async (slug: string | undefined): Promise<string[]> =>
  ((await ProductModel.collection.findOne({ slug })) as { images: { url: string }[] } | null)?.images.map(
    (i) => i.url,
  ) ?? [];

beforeAll(async () => {
  await ProductModel.collection.deleteMany({});
  // Raw inserts: only the fields this migration reads.
  await ProductModel.collection.insertMany([
    { slug: legacySlug, images: [{ url: `/images/products/${legacySlug}.webp`, alt: "" }] },
    { slug: emptySlug, images: [] },
    { slug: sellerSlug, images: [{ url: "https://cdn.example/seller-upload.webp", alt: "" }] },
  ]);
});

describe("migration 0005 (demo photo sets)", () => {
  it("replaces the legacy single photo and fills empty products, but never seller uploads", async () => {
    await migration.up(ProductModel.db);
    expect(await urls(legacySlug)).toEqual(sets.get(legacySlug ?? "")?.map((i) => i.url));
    expect(await urls(emptySlug)).toEqual(sets.get(emptySlug ?? "")?.map((i) => i.url));
    expect(await urls(sellerSlug)).toEqual(["https://cdn.example/seller-upload.webp"]);
  });

  it("is idempotent", async () => {
    await migration.up(ProductModel.db);
    expect((await urls(legacySlug)).length).toBe(sets.get(legacySlug ?? "")?.length);
  });
});
