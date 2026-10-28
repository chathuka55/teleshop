import { beforeAll, describe, expect, it } from "vitest";
import { BrandModel, CategoryModel, InventoryModel, ProductModel, SellerModel, UserModel } from "@/db/models";
import {
  addProductImage,
  findSellerProduct,
  listSellerProducts,
  listSellerStock,
} from "@/db/repositories/seller-product.repository";
import type { SessionUser } from "@/lib/auth/claims";
import { changeStockFor, productStatusFor, saveProductFor } from "@/modules/products/service";
import type { ProductInput } from "@/modules/products/schema";
import { seedDatabase } from "../../../scripts/seed/seed-db";
import { connectTestDatabase } from "../../support/db";

connectTestDatabase("t_seller_products");

const ctx = { ip: "203.0.113.50" };
let shopA: SessionUser;
let shopB: SessionUser;
let phones = "";
let apple = "";

async function sellerUser(slug: string): Promise<SessionUser> {
  const s = await SellerModel.findOne({ slug }).lean();
  const u = await UserModel.findById(s?.userId).lean();
  return {
    id: String(u?._id),
    name: u?.name ?? "",
    email: u?.email ?? "",
    image: null,
    role: "seller",
    sellerId: String(s?._id),
    emailVerified: true,
    twoFactorVerified: false,
  };
}

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  id: "",
  categoryId: phones,
  brandId: apple,
  name: "Apple iPhone 16e",
  shortName: "iPhone 16e",
  condition: "new",
  shortDescription: "A18 chip, 48 MP camera.",
  description: "Brand new, sealed box.",
  highlights: ["Official warranty"],
  specs: { storage: "128GB", chip: "A18" },
  warrantyMonths: 12,
  warrantyType: "manufacturer",
  freeDelivery: false,
  variants: [
    {
      sku: "",
      label: "",
      attributes: { storage: "128GB", colour: "Black" },
      price: 18_990_000,
      compareAt: "",
      stock: 5,
      isActive: true,
    },
    {
      sku: "",
      label: "",
      attributes: { storage: "256GB", colour: "Black" },
      price: 21_990_000,
      compareAt: "",
      stock: 2,
      isActive: true,
    },
  ],
  ...over,
});

/** The form sends existing variants back with their SKUs. */
async function edit(id: string, change: (p: ProductInput) => ProductInput) {
  const p = await findSellerProduct(shopA.sellerId ?? "", id);
  if (!p) throw new Error("not found");
  const current: ProductInput = {
    ...input(),
    id,
    variants: p.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      attributes: v.attributes,
      price: v.priceCents,
      compareAt: v.compareAtCents ?? "",
      stock: 0,
      isActive: v.isActive,
    })),
  };
  return saveProductFor(shopA, change(current), ctx);
}

beforeAll(async () => {
  await seedDatabase({ fixedPassword: "test-password-123" });
  phones = String((await CategoryModel.findOne({ slug: "mobile-phones" }).lean())?._id);
  apple = String((await BrandModel.findOne({ slug: "apple" }).lean())?._id);
  shopA = await sellerUser("istore-colombo");
  shopB = await sellerUser("pc-forge");
}, 120_000);

describe("seller products (P6-T03)", () => {
  it("creates a draft with generated SKUs, variant options and opening stock", async () => {
    const r = await saveProductFor(shopA, input(), ctx);
    expect(r.ok && r.status).toBe("draft");
    if (!r.ok) return;
    const p = await ProductModel.findById(r.id).lean();
    expect(p?.slug).toBe("apple-iphone-16e");
    expect(p?.basePriceCents).toBe(18_990_000);
    expect(p?.variants.map((v) => v.label)).toEqual(["128GB / Black", "256GB / Black"]);
    expect(p?.variants.every((v) => /^IPHONE-16E-/.test(v.sku))).toBe(true);
    const stock = await InventoryModel.find({ productId: p?._id }).sort({ onHand: -1 }).lean();
    expect(stock.map((s) => [s.onHand, s.available, s.reserved, String(s.sellerId)])).toEqual([
      [5, 5, 0, shopA.sellerId],
      [2, 2, 0, shopA.sellerId],
    ]);
    // Same name again → a different slug, never a clash.
    const again = await saveProductFor(shopA, input(), ctx);
    expect(again.ok && (await ProductModel.findById(again.id).lean())?.slug).toMatch(
      /^apple-iphone-16e-[a-f0-9]{6}$/,
    );
  });

  it("refuses a SKU another product uses, and specs outside the template", async () => {
    const taken = await saveProductFor(
      shopA,
      input({ variants: [{ ...input().variants[0]!, sku: "IP17P-256-ORG" }] }),
      ctx,
    );
    expect(!taken.ok && taken.fields?.["variants.0.sku"]).toMatch(/already used/);
    const spec = await saveProductFor(shopA, input({ specs: { storage: "3TB" } }), ctx);
    expect(!spec.ok && spec.fields?.["specs.storage"]).toMatch(/Choose one of/);
  });

  it("draft → review needs a photo; price moves over 20 % go back to review", async () => {
    const r = await saveProductFor(shopA, input({ name: "Apple iPhone 16e Review" }), ctx);
    if (!r.ok) throw new Error(r.message);
    const noPhoto = await productStatusFor(shopA, { id: r.id, action: "submit" }, ctx);
    expect(noPhoto.ok).toBe(false);

    await addProductImage(
      shopA.sellerId ?? "",
      r.id,
      { url: "https://example.test/p.webp", width: 800, height: 800, alt: "" },
      8,
    );
    expect((await productStatusFor(shopA, { id: r.id, action: "submit" }, ctx)).ok).toBe(true);
    expect((await ProductModel.findById(r.id).lean())?.status).toBe("pending_review");

    // An admin approves it (Phase 7).
    await ProductModel.updateOne({ _id: r.id }, { $set: { status: "published", publishedAt: new Date() } });

    const small = await edit(r.id, (p) => ({
      ...p,
      variants: p.variants.map((v, i) => (i === 0 ? { ...v, price: 20_500_000 } : v)),
    }));
    expect(small.ok && small.status).toBe("published");
    const big = await edit(r.id, (p) => ({
      ...p,
      variants: p.variants.map((v, i) => (i === 0 ? { ...v, price: 27_000_000 } : v)),
    }));
    expect(big.ok && big.status).toBe("pending_review");

    await ProductModel.updateOne({ _id: r.id }, { $set: { status: "published" } });
    expect((await productStatusFor(shopA, { id: r.id, action: "deactivate" }, ctx)).ok).toBe(true);
    expect((await productStatusFor(shopA, { id: r.id, action: "reactivate" }, ctx)).ok).toBe(true);
    // Approved before → straight back on sale.
    expect((await ProductModel.findById(r.id).lean())?.status).toBe("published");
  });

  it("stock: steppers, set, and never below what open orders reserved", async () => {
    const r = await saveProductFor(shopA, input({ name: "Apple iPhone 16e Stock" }), ctx);
    if (!r.ok) throw new Error(r.message);
    const sku = (await findSellerProduct(shopA.sellerId ?? "", r.id))?.variants[0]?.sku ?? "";

    expect((await changeStockFor(shopA, { sku, mode: "add", qty: 3 }, ctx)).ok).toBe(true);
    expect((await changeStockFor(shopA, { sku, mode: "remove", qty: 1 }, ctx)).ok).toBe(true);
    expect((await InventoryModel.findOne({ sku }).lean())?.onHand).toBe(7);

    // Two units go to open orders.
    await InventoryModel.updateOne({ sku }, { $inc: { reserved: 2, available: -2 } });
    const tooLow = await changeStockFor(shopA, { sku, mode: "set", qty: 1 }, ctx);
    expect(tooLow.ok).toBe(false);
    expect((await changeStockFor(shopA, { sku, mode: "set", qty: 2 }, ctx)).ok).toBe(true);
    expect(await InventoryModel.findOne({ sku }).select("onHand reserved available").lean()).toMatchObject({
      onHand: 2,
      reserved: 2,
      available: 0,
    });

    // A variant with reserved units can't be removed from the product.
    const removed = await edit(r.id, (p) => ({ ...p, variants: p.variants.filter((v) => v.sku !== sku) }));
    expect(removed.ok).toBe(false);
    expect(await InventoryModel.countDocuments({ sku })).toBe(1);
  });

  it("another shop can't see or change these products or their stock", async () => {
    const r = await saveProductFor(shopA, input({ name: "Apple iPhone 16e Private" }), ctx);
    if (!r.ok) throw new Error(r.message);
    const sku = (await findSellerProduct(shopA.sellerId ?? "", r.id))?.variants[0]?.sku ?? "";

    expect(await findSellerProduct(shopB.sellerId ?? "", r.id)).toBeNull();
    expect((await listSellerProducts(shopB.sellerId ?? "")).some((p) => p.id === r.id)).toBe(false);
    expect((await listSellerStock(shopB.sellerId ?? "")).some((s) => s.sku === sku)).toBe(false);

    const hijack = await saveProductFor(shopB, { ...input({ name: "Hijacked" }), id: r.id }, ctx);
    expect(hijack.ok).toBe(false);
    expect((await productStatusFor(shopB, { id: r.id, action: "deactivate" }, ctx)).ok).toBe(false);
    expect((await changeStockFor(shopB, { sku, mode: "set", qty: 0 }, ctx)).ok).toBe(false);
    expect(
      await addProductImage(
        shopB.sellerId ?? "",
        r.id,
        { url: "https://x.test/a.webp", width: 1, height: 1, alt: "" },
        8,
      ),
    ).toBe(false);

    const p = await ProductModel.findById(r.id).lean();
    expect([p?.name, p?.status, p?.images.length]).toEqual(["Apple iPhone 16e Private", "draft", 0]);
    expect((await InventoryModel.findOne({ sku }).lean())?.onHand).toBe(5);
  });
});
