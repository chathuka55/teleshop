import { Types } from "mongoose";
import type { SettingsDTO } from "./settings.repository";
import { connectDB } from "../mongoose";
import { BrandModel } from "../models/brand.model";
import { CategoryModel } from "../models/category.model";
import { CourierModel } from "../models/courier.model";
import { InventoryModel } from "../models/inventory.model";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { SellerModel } from "../models/seller.model";
import { SettingsModel } from "../models/settings.model";
import { $gte, $in } from "../operators";

/** Admin configuration (A7, A8, A12, A13). Admin-only: the services assert the role first. */

const isId = (id: string): boolean => /^[a-f0-9]{24}$/.test(id);
const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

// ---- Settings ----

export async function saveSettings(
  s: Pick<SettingsDTO, "deliveryFeeCents" | "expressFeeCents" | "codEnabled" | "platformFeeBp">,
): Promise<void> {
  await connectDB();
  await SettingsModel.updateOne({ _id: "global" }, { $set: s }, { upsert: true, runValidators: true });
}

// ---- Couriers ----

export type CourierRow = {
  id: string;
  name: string;
  codePattern: string;
  trackingUrlTemplate: string;
  isActive: boolean;
  shipments: number;
};

export async function listAllCouriers(): Promise<CourierRow[]> {
  await connectDB();
  const [rows, used] = await Promise.all([
    CourierModel.find().sort({ name: 1 }).lean<
      {
        _id: Types.ObjectId;
        name: string;
        codePattern: string;
        trackingUrlTemplate: string;
        isActive: boolean;
      }[]
    >(),
    OrderModel.aggregate<{ _id: string; n: number }>([
      { $unwind: "$packages" },
      { $match: { "packages.shipment.courierName": { $type: "string" } } },
      { $group: { _id: "$packages.shipment.courierName", n: { $sum: 1 } } },
    ]),
  ]);
  const count = new Map(used.map((u) => [u._id, u.n]));
  return rows.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    codePattern: c.codePattern,
    trackingUrlTemplate: c.trackingUrlTemplate,
    isActive: c.isActive,
    shipments: count.get(c.name) ?? 0,
  }));
}

/** Create (no id) or update. Returns false when the id doesn't exist. Name clashes throw 11000. */
export async function saveCourier(
  id: string | null,
  c: { name: string; codePattern: string; trackingUrlTemplate: string; isActive: boolean },
): Promise<boolean> {
  await connectDB();
  if (!id) {
    await CourierModel.create(c);
    return true;
  }
  if (!isId(id)) return false;
  const r = await CourierModel.updateOne({ _id: oid(id) }, { $set: c }, { runValidators: true });
  return r.matchedCount === 1;
}

// ---- Brands (A7) ----

export type BrandRow = { id: string; name: string; slug: string; isActive: boolean; products: number };

export async function listAllBrands(): Promise<BrandRow[]> {
  await connectDB();
  const [rows, counts] = await Promise.all([
    BrandModel.find()
      .sort({ name: 1 })
      .lean<{ _id: Types.ObjectId; name: string; slug: string; isActive: boolean }[]>(),
    ProductModel.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $group: { _id: "$brandId", n: { $sum: 1 } } },
    ]),
  ]);
  const n = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return rows.map((b) => ({
    id: b._id.toString(),
    name: b.name,
    slug: b.slug,
    isActive: b.isActive,
    products: n.get(b._id.toString()) ?? 0,
  }));
}

export async function slugInUse(model: "brand" | "category", slug: string): Promise<boolean> {
  await connectDB();
  return model === "brand"
    ? (await BrandModel.countDocuments({ slug })) > 0
    : (await CategoryModel.countDocuments({ slug })) > 0;
}

/** Create (slug given) or rename / activate. The slug never changes: product links use it. */
export async function saveBrand(
  id: string | null,
  b: { name: string; isActive: boolean; slug?: string },
): Promise<boolean> {
  await connectDB();
  if (!id) {
    await BrandModel.create({ name: b.name, slug: b.slug, isActive: b.isActive });
    return true;
  }
  if (!isId(id)) return false;
  const r = await BrandModel.updateOne({ _id: oid(id) }, { $set: { name: b.name, isActive: b.isActive } });
  return r.matchedCount === 1;
}

// ---- Categories (A7) ----

export type SpecFieldRow = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit: string;
  options: string[];
  filterable: boolean;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  requiresSerial: boolean;
  isActive: boolean;
  sortOrder: number;
  specTemplate: SpecFieldRow[];
  products: number;
};

type LeanCategory = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  requiresSerial?: boolean;
  isActive: boolean;
  sortOrder?: number;
  specTemplate?: {
    key: string;
    label: string;
    type?: SpecFieldRow["type"];
    unit?: string | null;
    options?: string[];
    filterable?: boolean;
  }[];
};

const toRow = (c: LeanCategory, products: number): CategoryRow => ({
  id: c._id.toString(),
  name: c.name,
  slug: c.slug,
  icon: c.icon,
  requiresSerial: !!c.requiresSerial,
  isActive: c.isActive,
  sortOrder: c.sortOrder ?? 0,
  specTemplate: (c.specTemplate ?? []).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type ?? "text",
    unit: f.unit ?? "",
    options: f.options ?? [],
    filterable: !!f.filterable,
  })),
  products,
});

export async function listAllCategories(): Promise<CategoryRow[]> {
  await connectDB();
  const [rows, counts] = await Promise.all([
    CategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean<LeanCategory[]>(),
    ProductModel.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $group: { _id: "$categoryId", n: { $sum: 1 } } },
    ]),
  ]);
  const n = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return rows.map((c) => toRow(c, n.get(c._id.toString()) ?? 0));
}

export async function findCategory(id: string): Promise<CategoryRow | null> {
  if (!isId(id)) return null;
  await connectDB();
  const c = await CategoryModel.findById(id).lean<LeanCategory>();
  return c ? toRow(c, await ProductModel.countDocuments({ categoryId: c._id })) : null;
}

export async function saveCategory(
  id: string | null,
  c: Omit<CategoryRow, "id" | "slug" | "products"> & { slug?: string },
): Promise<string | null> {
  await connectDB();
  const fields = {
    name: c.name,
    icon: c.icon,
    requiresSerial: c.requiresSerial,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    specTemplate: c.specTemplate.map((f) => ({
      ...f,
      unit: f.unit || null,
      options: f.type === "select" ? f.options : [],
    })),
  };
  if (!id) {
    const doc = await CategoryModel.create({ ...fields, slug: c.slug, parentId: null });
    return doc._id.toString();
  }
  if (!isId(id)) return null;
  const r = await CategoryModel.updateOne({ _id: oid(id) }, { $set: fields }, { runValidators: true });
  return r.matchedCount === 1 ? id : null;
}

// ---- Stock across shops (A8) ----

export type LowStockRow = {
  sku: string;
  productId: string;
  productName: string;
  shopName: string;
  available: number;
  reserved: number;
  lowStockAt: number;
};

/** Published products at or below their low-stock mark, emptiest first. */
export async function listLowStock(limit = 100): Promise<LowStockRow[]> {
  await connectDB();
  const rows = await InventoryModel.aggregate<{
    sku: string;
    productId: Types.ObjectId;
    sellerId: Types.ObjectId;
    available: number;
    reserved: number;
    lowStockAt?: number;
  }>([
    { $match: { $expr: { $lte: ["$available", { $ifNull: ["$lowStockAt", 5] }] } } },
    { $sort: { available: 1, sku: 1 } },
    { $limit: limit * 2 },
  ]);
  const [products, shops] = await Promise.all([
    ProductModel.find({ _id: $in(rows.map((r) => r.productId)), status: "published" })
      .select("name")
      .lean<{ _id: Types.ObjectId; name: string }[]>(),
    SellerModel.find({ _id: $in(rows.map((r) => r.sellerId)) })
      .select("shopName")
      .lean<{ _id: Types.ObjectId; shopName: string }[]>(),
  ]);
  const name = new Map(products.map((p) => [p._id.toString(), p.name]));
  const shop = new Map(shops.map((s) => [s._id.toString(), s.shopName]));
  return rows
    .filter((r) => name.has(r.productId.toString()))
    .slice(0, limit)
    .map((r) => ({
      sku: r.sku,
      productId: r.productId.toString(),
      productName: name.get(r.productId.toString()) ?? "",
      shopName: shop.get(r.sellerId.toString()) ?? "",
      available: r.available,
      reserved: r.reserved,
      lowStockAt: r.lowStockAt ?? 5,
    }));
}

// ---- Reports (A12) ----

export type MonthRow = {
  month: string;
  orders: number;
  cancelled: number;
  deliveredItemsCents: number;
  deliveredCents: number;
};

/** Orders placed and delivered value per month (Sri Lanka time), from `since`. */
export async function monthlyTotals(since: Date): Promise<MonthRow[]> {
  await connectDB();
  const month = { $dateToString: { format: "%Y-%m", date: "$placedAt", timezone: "+05:30" } };
  const [orders, delivered] = await Promise.all([
    OrderModel.aggregate<{ _id: string; orders: number; cancelled: number }>([
      { $match: { placedAt: $gte(since) } },
      {
        $group: {
          _id: month,
          orders: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]),
    OrderModel.aggregate<{ _id: string; items: number; total: number }>([
      { $match: { placedAt: $gte(since) } },
      { $unwind: "$packages" },
      { $match: { "packages.status": "delivered" } },
      {
        $group: {
          _id: month,
          items: { $sum: "$packages.subtotalCents" },
          total: { $sum: { $add: ["$packages.subtotalCents", "$packages.deliveryCents"] } },
        },
      },
    ]),
  ]);
  const d = new Map(delivered.map((x) => [x._id, x]));
  return orders
    .map((o) => ({
      month: o._id,
      orders: o.orders,
      cancelled: o.cancelled,
      deliveredItemsCents: d.get(o._id)?.items ?? 0,
      deliveredCents: d.get(o._id)?.total ?? 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type TopRow = { id: string; name: string; units: number; cents: number };

/** Best shops and products by delivered value since `since`. */
export async function topSellersAndProducts(
  since: Date,
  limit = 5,
): Promise<{ shops: TopRow[]; products: TopRow[] }> {
  await connectDB();
  const base = [
    { $match: { placedAt: $gte(since) } },
    { $unwind: "$packages" },
    { $match: { "packages.status": "delivered" } },
  ];
  const [shops, products] = await Promise.all([
    OrderModel.aggregate<{ _id: Types.ObjectId; cents: number; units: number }>([
      ...base,
      {
        $group: {
          _id: "$packages.sellerId",
          cents: { $sum: "$packages.subtotalCents" },
          units: { $sum: { $sum: "$packages.items.qty" } },
        },
      },
      { $sort: { cents: -1 } },
      { $limit: limit },
    ]),
    OrderModel.aggregate<{ _id: Types.ObjectId; name: string; cents: number; units: number }>([
      ...base,
      { $unwind: "$packages.items" },
      {
        $group: {
          _id: "$packages.items.productId",
          name: { $first: "$packages.items.name" },
          cents: { $sum: "$packages.items.lineTotalCents" },
          units: { $sum: "$packages.items.qty" },
        },
      },
      { $sort: { cents: -1 } },
      { $limit: limit },
    ]),
  ]);
  const shopNames = await SellerModel.find({ _id: $in(shops.map((s) => s._id)) })
    .select("shopName")
    .lean<{ _id: Types.ObjectId; shopName: string }[]>();
  const sn = new Map(shopNames.map((s) => [s._id.toString(), s.shopName]));
  return {
    shops: shops.map((s) => ({
      id: s._id.toString(),
      name: sn.get(s._id.toString()) ?? "",
      units: s.units,
      cents: s.cents,
    })),
    products: products.map((p) => ({ id: p._id.toString(), name: p.name, units: p.units, cents: p.cents })),
  };
}
