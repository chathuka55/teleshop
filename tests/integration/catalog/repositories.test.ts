import mongoose from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import { UserModel } from "@/db/models";
import { findUserByEmail } from "@/db/repositories/user.repository";
import { priceGuestCart } from "@/modules/cart/service";
import {
  getCategory,
  getProductBySlug,
  getProductsBySkus,
  getSeller,
  listBrands,
  listCategories,
  listFeaturedProducts,
  listSellers,
  searchProducts,
} from "@/modules/catalog/service";
import { trackOrderSchema } from "@/modules/orders/schema";
import { trackOrder } from "@/modules/orders/service";
import { seedDatabase, type SeedResult } from "../../../scripts/seed/seed-db";
import { seedProducts } from "../../../scripts/seed/data/catalog";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_catalog");

let seeded: SeedResult;
beforeAll(async () => {
  seeded = await seedDatabase({ fixedPassword: "test-password-123" });
}, 120_000);

describe("seed (P1-T07)", () => {
  it("creates ≥ 40 products, 3+ sellers and dev accounts", () => {
    expect(seeded.counts.products).toBe(seedProducts.length);
    expect(seeded.counts.products).toBeGreaterThanOrEqual(40);
    expect(seeded.counts.sellers).toBeGreaterThanOrEqual(3);
    expect(seeded.accounts.map((a) => a.email)).toContain("admin@teleshop.local");
  });

  it("stores passwords as Argon2id hashes only", async () => {
    const u = await UserModel.findOne({ email: "customer@teleshop.local" }).select("+passwordHash").lean();
    expect(u?.passwordHash).toMatch(/^\$argon2id\$/);
  });
});

describe("user repository (P1-T05)", () => {
  it("never returns passwordHash or 2FA secrets", async () => {
    const u = await findUserByEmail("ADMIN@teleshop.local");
    expect(u?.role).toBe("admin");
    expect(Object.keys(u ?? {})).not.toEqual(expect.arrayContaining(["passwordHash"]));
    expect(JSON.stringify(u)).not.toMatch(/argon2|passwordHash|twoFactor|secret/i);
  });
});

describe("catalogue reads", () => {
  it("lists categories with live product counts", async () => {
    const cats = await listCategories();
    expect(cats.map((c) => c.slug)).toEqual([
      "mobile-phones",
      "laptops",
      "pc-components",
      "audio",
      "wearables",
      "monitors",
      "gaming",
      "networking",
    ]);
    const phones = cats.find((c) => c.slug === "mobile-phones");
    expect(phones?.productCount).toBe(seedProducts.filter((p) => p.category === "mobile-phones").length);
    expect(phones?.specFilters.map((f) => f.key)).toEqual(["storage", "ram"]);
    expect(await getCategory("nope")).toBeNull();
  });

  it("lists brands and approved sellers", async () => {
    expect((await listBrands()).length).toBeGreaterThanOrEqual(12);
    const sellers = await listSellers();
    expect(sellers.map((s) => s.slug)).toContain("pc-forge");
    const forge = await getSeller("pc-forge");
    expect(forge?.since).toBe(2016);
    expect(forge?.productCount).toBe(seedProducts.filter((p) => p.seller === "pc-forge").length);
  });

  it("hides sellers that are not approved", async () => {
    await mongoose.connection
      .collection("sellers")
      .updateOne({ slug: "soundwave" }, { $set: { approvalStatus: "suspended" } });
    expect(await getSeller("soundwave")).toBeNull();
    expect((await listSellers()).map((s) => s.slug)).not.toContain("soundwave");
    await mongoose.connection
      .collection("sellers")
      .updateOne({ slug: "soundwave" }, { $set: { approvalStatus: "approved" } });
  });

  it("featured = curated insertion order", async () => {
    const featured = await listFeaturedProducts(4);
    expect(featured.map((p) => p.slug)).toEqual([
      "apple-iphone-17-pro",
      "samsung-galaxy-s26-ultra",
      "asus-rog-zephyrus-g16",
      "apple-macbook-air-13-m4",
    ]);
  });
});

describe("searchProducts", () => {
  it("filters by category + brand", async () => {
    const page = await searchProducts({ category: "mobile-phones", brand: ["apple"] });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((p) => p.category.slug === "mobile-phones" && p.brand.slug === "apple")).toBe(
      true,
    );
  });

  it("filters by condition and price range (cents)", async () => {
    const page = await searchProducts({ condition: ["refurbished"], maxPriceCents: 20_000_000, limit: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((p) => p.condition === "refurbished" && p.priceCents <= 20_000_000)).toBe(true);
  });

  it("sorts by price ascending and paginates with a cursor", async () => {
    const first = await searchProducts({ sort: "price_asc", limit: 5 });
    const prices = first.items.map((p) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(first.total).toBe(seedProducts.length);
    expect(first.nextCursor).toBe("5");
    const second = await searchProducts({ sort: "price_asc", limit: 5, cursor: "5" });
    expect(second.items[0]?.priceCents).toBeGreaterThanOrEqual(prices.at(-1) ?? 0);
  });

  it("sorts by biggest discount", async () => {
    const top = (await searchProducts({ sort: "discount", limit: 1 })).items[0];
    expect(top?.slug).toBe("lenovo-thinkpad-t14-gen-5-refurbished"); // 189k vs 265k ≈ 29 %
  });

  it("full-text search matches product names", async () => {
    const page = await searchProducts({ q: "macbook" });
    expect(page.items.map((p) => p.slug)).toEqual(
      expect.arrayContaining(["apple-macbook-air-13-m4", "apple-macbook-pro-14-m5"]),
    );
  });

  it("in-stock filter uses inventory", async () => {
    const all = await searchProducts({ limit: 50 });
    const inStock = await searchProducts({ inStock: true, limit: 50 });
    expect(inStock.total).toBeLessThanOrEqual(all.total);
    expect(inStock.total).toBeGreaterThan(0);
  });

  it("scopes to one seller", async () => {
    const page = await searchProducts({ seller: "gadget-lab", limit: 50 });
    expect(page.items.every((p) => p.seller.slug === "gadget-lab")).toBe(true);
  });

  it("unknown category or seller → empty page, not everything", async () => {
    expect((await searchProducts({ category: "nope" })).total).toBe(0);
    expect((await searchProducts({ seller: "nope" })).total).toBe(0);
  });
});

describe("product detail", () => {
  it("returns variants with live stock and ordered specs", async () => {
    const p = await getProductBySlug("apple-iphone-17-pro");
    expect(p?.variants.find((v) => v.sku === "IP17P-256-ORG")?.available).toBe(7); // 8 on hand − 1 reserved
    expect(p?.variants.find((v) => v.sku === "IP17P-512-BLU")?.inStock).toBe(false);
    expect(p?.specs[0]).toEqual({ label: "Display", value: "6.3″ Super Retina XDR, 120Hz" });
    expect(p?.priceCents).toBe(38_990_000);
  });

  it("hides unpublished products", async () => {
    await mongoose.connection
      .collection("products")
      .updateOne({ slug: "jbl-charge-6" }, { $set: { status: "blocked" } });
    expect(await getProductBySlug("jbl-charge-6")).toBeNull();
    await mongoose.connection
      .collection("products")
      .updateOne({ slug: "jbl-charge-6" }, { $set: { status: "published" } });
  });

  it("finds products by SKU for cart pricing", async () => {
    const list = await getProductsBySkus(["IP17P-256-ORG", "ROG-G16-5070-32", "NOPE-1"]);
    expect(list.map((p) => p.slug).sort()).toEqual(["apple-iphone-17-pro", "asus-rog-zephyrus-g16"]);
  });
});

describe("cart pricing from the database", () => {
  it("prices from products + settings, never from the client", async () => {
    const cart = await priceGuestCart([
      { sku: "IP17P-256-ORG", qty: 1 },
      { sku: "ROG-G16-5070-32", qty: 1 },
    ]);
    expect(cart.subtotalCents).toBe(38_990_000 + 68_500_000);
    expect(cart.deliveryCents).toBe(2 * 45_000); // settings.global.deliveryFeeCents, two shops
  });
});

describe("order tracking", () => {
  const input = trackOrderSchema.parse({ orderNo: "TS-2026-000123", phone: "077 123 4567" });

  it("returns packages, courier link and the latest event", async () => {
    const r = await trackOrder(input);
    expect(r?.packages).toHaveLength(2);
    const shipped = r?.packages.find((p) => p.status === "shipped");
    expect(shipped?.shipment?.trackingUrl).toBe("https://promptxpress.lk/track?code=PX-7731%202093%20LK");
    expect(r?.lastUpdate.note).toBe("Handed to Prompt Xpress");
  });

  it("never exposes the phone, address or prices", async () => {
    const json = JSON.stringify(await trackOrder(input));
    expect(json).not.toMatch(/771234567|Temple Road|Cents/);
  });

  it("answers the same for a wrong phone and an unknown order (no enumeration)", async () => {
    expect(await trackOrder({ ...input, phone: "+94770000000" })).toBeNull();
    expect(await trackOrder({ ...input, orderNo: "TS-2026-999999" })).toBeNull();
  });
});

describe("spec filters on MongoDB (P3-T04)", () => {
  it("matches the start of a spec value: 1TB finds '1TB SSD' laptops only", async () => {
    const page = await searchProducts({ category: "laptops", specs: { storage: ["1TB"] }, limit: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    for (const p of page.items) {
      const full = await getProductBySlug(p.slug);
      const storage = full?.specs.find((s) => s.label.toLowerCase() === "storage")?.value ?? "";
      const variantHas = full?.variants.some((v) => v.attributes.storage === "1TB");
      expect(storage.startsWith("1TB") || variantHas).toBe(true);
    }
  });

  it("matches variant attributes: 512GB finds phones sold in a 512GB variant", async () => {
    const page = await searchProducts({
      category: "mobile-phones",
      specs: { storage: ["512GB"] },
      limit: 50,
    });
    expect(page.items.map((p) => p.slug)).toContain("apple-iphone-17-pro");
  });

  it("ANDs different specs and ORs values of one spec", async () => {
    const one = await searchProducts({ category: "mobile-phones", specs: { storage: ["128GB"] }, limit: 50 });
    const either = await searchProducts({
      category: "mobile-phones",
      specs: { storage: ["128GB", "512GB"] },
      limit: 50,
    });
    const both = await searchProducts({
      category: "mobile-phones",
      specs: { storage: ["512GB"], ram: ["8GB"] },
      limit: 50,
    });
    expect(either.total).toBeGreaterThanOrEqual(one.total);
    expect(both.total).toBeLessThanOrEqual(either.total);
  });
});
