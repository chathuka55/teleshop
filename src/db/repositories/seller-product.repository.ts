import { Types, type ClientSession } from "mongoose";
import type {
  ProductFormOptionsDTO,
  ProductStatus,
  SellerProductDTO,
  SellerProductSummaryDTO,
  SpecFieldDTO,
  StockRowDTO,
} from "@/modules/products/types";
import { connectDB } from "../mongoose";
import { BrandModel } from "../models/brand.model";
import { CategoryModel } from "../models/category.model";
import { InventoryModel } from "../models/inventory.model";
import { ProductModel } from "../models/product.model";
import { $exists, $gte, $in } from "../operators";
import type { LeanProduct } from "./catalog-mappers";

/**
 * Seller catalogue writes and reads (P6-T03). The seller id is a required argument of every
 * function and part of every filter, so one shop can never read or change another's products.
 */

export class ProductChangedError extends Error {
  constructor() {
    super("Product changed meanwhile");
    this.name = "ProductChangedError";
  }
}

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);
const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

type LeanStock = {
  sku: string;
  productId: Types.ObjectId;
  onHand: number;
  reserved: number;
  available: number;
  lowStockAt?: number;
};

type LeanSellerProduct = LeanProduct & { status: ProductStatus; updatedAt: Date };

type LeanTemplate = { _id: Types.ObjectId; name: string; specTemplate?: SpecFieldDTO[] };

export async function listProductFormOptions(): Promise<ProductFormOptionsDTO> {
  await connectDB();
  const [categories, brands] = await Promise.all([
    CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean<LeanTemplate[]>(),
    BrandModel.find({ isActive: true })
      .sort({ name: 1 })
      .select("name")
      .lean<{ _id: Types.ObjectId; name: string }[]>(),
  ]);
  return {
    categories: categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      specTemplate: (c.specTemplate ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type ?? "text",
        unit: f.unit ?? null,
        options: f.options ?? [],
      })),
    })),
    brands: brands.map((b) => ({ id: b._id.toString(), name: b.name })),
  };
}

/** The category's spec template, or null when it doesn't exist / isn't active. */
export async function findSpecTemplate(categoryId: string): Promise<SpecFieldDTO[] | null> {
  if (!isId(categoryId)) return null;
  await connectDB();
  const c = await CategoryModel.findOne({ _id: oid(categoryId), isActive: true }).lean<LeanTemplate>();
  return c
    ? (c.specTemplate ?? []).map((f) => ({ ...f, unit: f.unit ?? null, options: f.options ?? [] }))
    : null;
}

export async function brandExists(brandId: string): Promise<boolean> {
  if (!isId(brandId)) return false;
  await connectDB();
  return (await BrandModel.countDocuments({ _id: oid(brandId), isActive: true })) > 0;
}

async function stockBySku(skus: readonly string[]): Promise<Map<string, LeanStock>> {
  const rows = await InventoryModel.find({ sku: $in(skus) })
    .select("sku productId onHand reserved available lowStockAt")
    .lean<LeanStock[]>();
  return new Map(rows.map((r) => [r.sku, r]));
}

const stockOf = (s: LeanStock | undefined) => ({
  onHand: s?.onHand ?? 0,
  reserved: s?.reserved ?? 0,
  available: s?.available ?? 0,
  lowStockAt: s?.lowStockAt ?? 5,
});

export async function listSellerProducts(sellerId: string): Promise<SellerProductSummaryDTO[]> {
  if (!isId(sellerId)) return [];
  await connectDB();
  const products = await ProductModel.find({ sellerId: oid(sellerId) })
    .sort({ updatedAt: -1 })
    .limit(500)
    .select("slug name status images variants.sku variants.priceCents variants.isActive updatedAt")
    .lean<LeanSellerProduct[]>();
  const stock = await stockBySku(products.flatMap((p) => p.variants.map((v) => v.sku)));
  return products.map((p) => {
    const active = p.variants.filter((v) => v.isActive);
    const prices = (active.length ? active : p.variants).map((v) => v.priceCents);
    const rows = p.variants.map((v) => stockOf(stock.get(v.sku)));
    return {
      id: p._id.toString(),
      slug: p.slug,
      name: p.name,
      status: p.status,
      imageUrl: p.images?.[0]?.url ?? null,
      minPriceCents: Math.min(...prices),
      maxPriceCents: Math.max(...prices),
      variantCount: p.variants.length,
      available: rows.reduce((n, r) => n + r.available, 0),
      lowStock: rows.some((r) => r.available <= r.lowStockAt),
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

export async function findSellerProduct(
  sellerId: string,
  productId: string,
): Promise<(SellerProductDTO & { updatedAt: Date }) | null> {
  if (!isId(sellerId) || !isId(productId)) return null;
  await connectDB();
  const p = await ProductModel.findOne({
    _id: oid(productId),
    sellerId: oid(sellerId),
  }).lean<LeanSellerProduct>();
  if (!p) return null;
  const stock = await stockBySku(p.variants.map((v) => v.sku));
  return {
    id: p._id.toString(),
    slug: p.slug,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    categoryId: p.categoryId.toString(),
    brandId: p.brandId.toString(),
    name: p.name,
    shortName: p.shortName,
    condition: p.condition,
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    highlights: p.highlights ?? [],
    specs: p.specs ?? {},
    warranty: p.warranty ?? { months: 0, type: "none" },
    freeDelivery: !!p.freeDelivery,
    images: (p.images ?? []).map((i) => ({ url: i.url, width: i.width ?? null, height: i.height ?? null })),
    variants: p.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      attributes: v.attributes ?? {},
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents ?? null,
      isActive: v.isActive,
      stock: stockOf(stock.get(v.sku)),
    })),
    updatedAt: p.updatedAt,
  };
}

/** SKUs already used by any product (SKUs are unique across the marketplace). */
export async function skusInUse(skus: readonly string[], exceptProductId?: string): Promise<string[]> {
  if (!skus.length) return [];
  await connectDB();
  const filter: Record<string, unknown> = { "variants.sku": $in(skus) };
  const rows = await ProductModel.find(filter)
    .select("variants.sku")
    .lean<{ _id: Types.ObjectId; variants: { sku: string }[] }[]>();
  const wanted = new Set(skus);
  return rows
    .filter((r) => r._id.toString() !== exceptProductId)
    .flatMap((r) => r.variants.map((v) => v.sku).filter((s) => wanted.has(s)));
}

export async function slugTaken(slug: string): Promise<boolean> {
  await connectDB();
  return (await ProductModel.countDocuments({ slug })) > 0;
}

export type ProductWrite = {
  categoryId: string;
  brandId: string;
  name: string;
  shortName: string;
  condition: "new" | "used" | "refurbished";
  shortDescription: string;
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  warranty: { months: number; type: "manufacturer" | "shop" | "none" };
  freeDelivery: boolean;
  variants: {
    sku: string;
    label: string;
    attributes: Record<string, string>;
    priceCents: number;
    compareAtCents: number | null;
    isActive: boolean;
  }[];
  basePriceCents: number;
};

const toDoc = (w: ProductWrite) => ({
  ...w,
  categoryId: oid(w.categoryId),
  brandId: oid(w.brandId),
});

export async function insertProduct(
  sellerId: string,
  slug: string,
  write: ProductWrite,
  stock: ReadonlyMap<string, number>,
  session: ClientSession,
): Promise<string> {
  const [doc] = await ProductModel.create(
    [{ ...toDoc(write), sellerId: oid(sellerId), slug, status: "draft", images: [] }],
    { session },
  );
  if (!doc) throw new Error("Product insert returned nothing");
  await insertStock(
    sellerId,
    doc._id.toString(),
    write.variants.map((v) => v.sku),
    stock,
    session,
  );
  return doc._id.toString();
}

/** One inventory document per new variant (available = onHand, nothing reserved yet). */
export async function insertStock(
  sellerId: string,
  productId: string,
  skus: readonly string[],
  stock: ReadonlyMap<string, number>,
  session: ClientSession,
): Promise<void> {
  if (!skus.length) return;
  await InventoryModel.create(
    skus.map((sku) => {
      const qty = stock.get(sku) ?? 0;
      return {
        sku,
        productId: oid(productId),
        sellerId: oid(sellerId),
        onHand: qty,
        reserved: 0,
        available: qty,
      };
    }),
    { session, ordered: true },
  );
}

/** Replaces the editable fields — only if the product is still exactly as the seller loaded it. */
export async function updateSellerProduct(
  sellerId: string,
  productId: string,
  seen: Date,
  write: ProductWrite,
  status: ProductStatus,
  session: ClientSession,
): Promise<void> {
  const r = await ProductModel.updateOne(
    { _id: oid(productId), sellerId: oid(sellerId), updatedAt: seen },
    { $set: { ...toDoc(write), status } },
    { session, runValidators: true },
  );
  if (r.matchedCount !== 1) throw new ProductChangedError();
}

/** Removes a variant's stock record — only while nothing is reserved by open orders. */
export async function deleteFreeStock(
  sellerId: string,
  sku: string,
  session: ClientSession,
): Promise<boolean> {
  const r = await InventoryModel.deleteOne({ sku, sellerId: oid(sellerId), reserved: 0 }, { session });
  return r.deletedCount === 1;
}

export async function setProductStatus(
  sellerId: string,
  productId: string,
  from: readonly ProductStatus[],
  to: ProductStatus,
): Promise<boolean> {
  if (!isId(sellerId) || !isId(productId)) return false;
  await connectDB();
  const r = await ProductModel.updateOne(
    { _id: oid(productId), sellerId: oid(sellerId), status: $in(from) },
    { $set: { status: to } },
  );
  return r.modifiedCount === 1;
}

/** Appends a photo while the product has fewer than `max`. */
export async function addProductImage(
  sellerId: string,
  productId: string,
  image: { url: string; width: number; height: number; alt: string },
  max: number,
): Promise<boolean> {
  if (!isId(sellerId) || !isId(productId)) return false;
  await connectDB();
  const r = await ProductModel.updateOne(
    {
      _id: oid(productId),
      sellerId: oid(sellerId),
      status: $in(["draft", "pending_review", "published", "inactive"]),
      [`images.${max - 1}`]: $exists(false),
    },
    { $push: { images: image } },
  );
  return r.modifiedCount === 1;
}

export async function removeProductImage(sellerId: string, productId: string, url: string): Promise<boolean> {
  if (!isId(sellerId) || !isId(productId)) return false;
  await connectDB();
  const r = await ProductModel.updateOne(
    { _id: oid(productId), sellerId: oid(sellerId) },
    { $pull: { images: { url } } },
  );
  return r.modifiedCount === 1;
}

/** Moves one photo to the front (the cover shown on cards). */
export async function makeCoverImage(sellerId: string, productId: string, url: string): Promise<boolean> {
  if (!isId(sellerId) || !isId(productId)) return false;
  await connectDB();
  const p = await ProductModel.findOne({ _id: oid(productId), sellerId: oid(sellerId) })
    .select("images updatedAt")
    .lean<{ images: { url: string }[]; updatedAt: Date }>();
  const i = p?.images.findIndex((img) => img.url === url) ?? -1;
  if (!p || i <= 0) return false;
  const images = [p.images[i], ...p.images.filter((_, j) => j !== i)];
  const r = await ProductModel.updateOne(
    { _id: oid(productId), sellerId: oid(sellerId), updatedAt: p.updatedAt },
    { $set: { images } },
  );
  return r.modifiedCount === 1;
}

export async function listSellerStock(sellerId: string): Promise<StockRowDTO[]> {
  if (!isId(sellerId)) return [];
  await connectDB();
  const products = await ProductModel.find({
    sellerId: oid(sellerId),
    status: $in(["draft", "pending_review", "published", "inactive"]),
  })
    .sort({ name: 1 })
    .select("name images variants.sku variants.label variants.isActive")
    .lean<LeanSellerProduct[]>();
  const stock = await stockBySku(products.flatMap((p) => p.variants.map((v) => v.sku)));
  return products.flatMap((p) =>
    p.variants.map((v) => ({
      ...stockOf(stock.get(v.sku)),
      productId: p._id.toString(),
      productName: p.name,
      sku: v.sku,
      label: v.label,
      imageUrl: p.images?.[0]?.url ?? null,
      isActive: v.isActive,
    })),
  );
}

/**
 * Stock change by the shop. `add`/`remove` are relative; `set` replaces the count on the shelf.
 * Units reserved by open orders can never be removed: available never goes below 0.
 */
export async function changeStock(
  sellerId: string,
  sku: string,
  change: { mode: "add" | "remove" | "set"; qty: number },
): Promise<{ ok: true; onHand: number } | { ok: false; reason: "NOT_FOUND" | "BELOW_RESERVED" }> {
  if (!isId(sellerId)) return { ok: false, reason: "NOT_FOUND" };
  await connectDB();
  const owner = { sku, sellerId: oid(sellerId) };
  const current = await InventoryModel.findOne(owner)
    .select("onHand reserved")
    .lean<{ onHand: number; reserved: number }>();
  if (!current) return { ok: false, reason: "NOT_FOUND" };

  const delta =
    change.mode === "add" ? change.qty : change.mode === "remove" ? -change.qty : change.qty - current.onHand;
  if (delta === 0) return { ok: true, onHand: current.onHand };
  // `available >= -delta` makes the decrement atomic: a parallel order can't push it below 0.
  const r = await InventoryModel.findOneAndUpdate(
    { ...owner, ...(delta < 0 ? { available: $gte(-delta) } : {}) },
    { $inc: { onHand: delta, available: delta, version: 1 } },
    { new: true },
  ).lean<{ onHand: number }>();
  return r ? { ok: true, onHand: r.onHand } : { ok: false, reason: "BELOW_RESERVED" };
}

/** SKUs at or below their low-stock mark (dashboard to-do). */
export async function countLowStock(sellerId: string): Promise<number> {
  if (!isId(sellerId)) return 0;
  await connectDB();
  const rows = await InventoryModel.aggregate<{ n: number }>([
    { $match: { sellerId: oid(sellerId) } },
    { $match: { $expr: { $lte: ["$available", { $ifNull: ["$lowStockAt", 5] }] } } },
    { $count: "n" },
  ]);
  return rows[0]?.n ?? 0;
}
