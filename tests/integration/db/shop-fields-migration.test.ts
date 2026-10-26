import { beforeAll, describe, expect, it } from "vitest";
import { SellerModel } from "@/db/models";
import { migration as m0006 } from "@/db/migrations/0006-demo-shop-profiles";
import { migration as m0007 } from "@/db/migrations/0007-fill-missing-shop-fields";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_shop_fields");

const read = async (slug: string) =>
  (await SellerModel.collection.findOne({ slug })) as {
    photos?: unknown[];
    openingHours?: string;
    coverUrl?: string | null;
  } | null;

beforeAll(async () => {
  await SellerModel.collection.deleteMany({});
  // Raw inserts like records created before v0.3: no photos / openingHours / coverUrl fields at all.
  await SellerModel.collection.insertMany([
    { slug: "pc-forge", description: "" },
    {
      slug: "soundwave",
      description: "",
      openingHours: "Open by appointment",
      photos: [{ url: "/own.webp" }],
    },
  ]);
});

describe("shop fields on pre-v0.3 records", () => {
  it("0006 alone misses fields that don't exist (the Atlas bug)", async () => {
    await m0006.up(SellerModel.db);
    const pc = await read("pc-forge");
    expect(pc?.coverUrl).toMatch(/pc-forge-1\.webp$/); // null matches missing → set
    expect(pc?.photos).toBeUndefined(); // [] never matches missing → not set
    expect(pc?.openingHours).toBeUndefined();
  });

  it("0007 fills the missing photos and hours, keeping a seller's own values", async () => {
    await m0007.up(SellerModel.db);
    const pc = await read("pc-forge");
    expect(pc?.photos?.length).toBeGreaterThanOrEqual(2);
    expect(pc?.openingHours).toMatch(/Mon/);
    const sw = await read("soundwave");
    expect(sw?.openingHours).toBe("Open by appointment");
    expect(sw?.photos).toEqual([{ url: "/own.webp" }]);
  });
});
