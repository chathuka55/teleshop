import { randomBytes } from "node:crypto";
import mongoose, { type Types } from "mongoose";
import { buildTrackingUrl } from "@/config/couriers";
import { migrateUp } from "@/db/migrations";
import {
  BrandModel,
  CategoryModel,
  CounterModel,
  CourierModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  PaymentModel,
  ProductModel,
  SellerModel,
  UserModel,
} from "@/db/models";
import { hashPassword } from "@/lib/auth/password";
import { seedBrands, seedCategories, seedDemoOrder, seedProducts, seedSellers } from "./data/catalog";

const lkr = (rupees: number): number => Math.round(rupees * 100);
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const DAY = 24 * 60 * 60 * 1000;

export type SeedResult = {
  accounts: { role: string; email: string; password: string }[];
  counts: Record<string, number>;
};

/** Random readable dev password, printed once by the CLI. */
function devPassword(): string {
  return `Ts-${randomBytes(9).toString("base64url")}`;
}

/**
 * Wipes and re-creates the development catalogue + demo order. Runs pending migrations first.
 * Never call against production — the CLI guards that.
 */
export async function seedDatabase(opts: { fixedPassword?: string } = {}): Promise<SeedResult> {
  await migrateUp(mongoose.connection);

  // Seed-owned collections only. couriers/settings/_migrations are kept.
  const wipe = [
    "users",
    "sellers",
    "categories",
    "brands",
    "products",
    "inventory",
    "reviews",
    "orders",
    "order_events",
    "payments",
    "carts",
    "wishlists",
    "addresses",
  ];
  await Promise.all(wipe.map((name) => mongoose.connection.collection(name).deleteMany({})));

  const accounts: SeedResult["accounts"] = [];
  const pw = async (role: string, email: string): Promise<string> => {
    const password = opts.fixedPassword ?? devPassword();
    accounts.push({ role, email, password });
    return hashPassword(password);
  };

  // ---- users ----
  const admin = await UserModel.create({
    email: "admin@teleshop.local",
    name: "Teleshop Admin",
    role: "admin",
    emailVerified: new Date(),
    passwordHash: await pw("admin", "admin@teleshop.local"),
  });
  const customer = await UserModel.create({
    email: seedDemoOrder.customerEmail,
    name: seedDemoOrder.customerName,
    phone: seedDemoOrder.phone,
    role: "customer",
    emailVerified: new Date(),
    passwordHash: await pw("customer", seedDemoOrder.customerEmail),
  });

  // ---- sellers (+ owner users) ----
  const sellerIds = new Map<string, Types.ObjectId>();
  for (const s of seedSellers) {
    const owner = await UserModel.create({
      email: s.ownerEmail,
      name: s.ownerName,
      role: "seller",
      emailVerified: new Date(),
      passwordHash: await pw(`seller (${s.shopName})`, s.ownerEmail),
    });
    const seller = await SellerModel.create({
      userId: owner._id,
      shopName: s.shopName,
      slug: s.slug,
      shopType: s.shopType,
      businessRegNo: s.businessRegNo,
      address: { line1: s.line1, city: s.city, district: s.district },
      phone: s.phone,
      establishedYear: s.establishedYear,
      tags: s.tags,
      approvalStatus: "approved",
      approvedBy: admin._id,
      approvedAt: new Date(),
      rating: s.rating,
    });
    sellerIds.set(s.slug, seller._id);
  }

  // ---- categories & brands ----
  const categoryIds = new Map<string, Types.ObjectId>();
  for (const [i, c] of seedCategories.entries()) {
    const doc = await CategoryModel.create({ ...c, sortOrder: i, isActive: true });
    categoryIds.set(c.slug, doc._id);
  }
  const brandIds = new Map<string, Types.ObjectId>();
  for (const name of seedBrands) {
    const doc = await BrandModel.create({ name, slug: slugify(name) });
    brandIds.set(slugify(name), doc._id);
  }

  // ---- products + inventory ----
  const reserved = new Map(seedDemoOrder.packages.map((p) => [p.sku, p.qty]));
  const productBySku = new Map<
    string,
    {
      productId: Types.ObjectId;
      sellerId: Types.ObjectId;
      name: string;
      label: string;
      priceCents: number;
      warrantyMonths: number;
    }
  >();
  const now = Date.now();
  for (const p of seedProducts) {
    const sellerId = sellerIds.get(p.seller);
    const categoryId = categoryIds.get(p.category);
    const brandId = brandIds.get(p.brand);
    if (!sellerId || !categoryId || !brandId)
      throw new Error(`Seed product ${p.slug}: unknown seller/category/brand`);
    const variants = p.variants.map((v) => ({
      sku: v.sku,
      label: v.label,
      attributes: v.attributes,
      priceCents: lkr(v.price),
      compareAtCents: v.compareAt ? lkr(v.compareAt) : null,
    }));
    const product = await ProductModel.create({
      sellerId,
      categoryId,
      brandId,
      name: p.name,
      shortName: p.shortName,
      slug: p.slug,
      shortDescription: p.shortDescription,
      description: p.description ?? p.shortDescription,
      highlights: p.highlights,
      condition: p.condition ?? "new",
      specs: p.specs,
      variants,
      basePriceCents: Math.min(...variants.map((v) => v.priceCents)),
      freeDelivery: !!p.freeDelivery,
      warranty: p.warranty,
      status: "published",
      rating: p.rating,
      publishedAt: new Date(now - (p.isNew ? 5 : 90) * DAY),
    });
    for (const v of p.variants) {
      const held = reserved.get(v.sku) ?? 0;
      await InventoryModel.create({
        sku: v.sku,
        productId: product._id,
        sellerId,
        onHand: v.stock + held,
        reserved: held,
        available: v.stock,
      });
      productBySku.set(v.sku, {
        productId: product._id,
        sellerId,
        name: p.name.split(" · ")[0] ?? p.name,
        label: v.label,
        priceCents: lkr(v.price),
        warrantyMonths: p.warranty.months,
      });
    }
  }

  // ---- demo order TS-2026-000123 ----
  const couriers = new Map((await CourierModel.find().lean()).map((c) => [c.name, c]));
  const fee = 45_000;
  const handedOverAt = new Date(now - 1 * DAY);
  const packages = seedDemoOrder.packages.map((pk) => {
    const item = productBySku.get(pk.sku);
    if (!item) throw new Error(`Demo order: unknown sku ${pk.sku}`);
    const courier = pk.shipment ? couriers.get(pk.shipment.courier) : undefined;
    return {
      _id: new mongoose.Types.ObjectId(),
      sellerId: item.sellerId,
      status: pk.status,
      items: [
        {
          productId: item.productId,
          sku: pk.sku,
          name: item.name,
          variantLabel: item.label,
          unitPriceCents: item.priceCents,
          qty: pk.qty,
          lineTotalCents: item.priceCents * pk.qty,
          warrantyMonths: item.warrantyMonths,
          serialNumber: pk.status === "shipped" ? "356938035643809" : null,
        },
      ],
      subtotalCents: item.priceCents * pk.qty,
      deliveryCents: fee,
      shipment:
        pk.shipment && courier
          ? {
              courierId: courier._id,
              courierName: courier.name,
              trackingCode: pk.shipment.trackingCode,
              trackingUrl: buildTrackingUrl(courier.trackingUrlTemplate, pk.shipment.trackingCode),
              handedOverAt,
              addedBy: admin._id,
              addedAt: handedOverAt,
            }
          : null,
    };
  });
  const subtotal = packages.reduce((n, p) => n + p.subtotalCents, 0);
  const delivery = packages.reduce((n, p) => n + p.deliveryCents, 0);
  const placedAt = new Date(now - 3 * DAY);
  const order = await OrderModel.create({
    orderNo: seedDemoOrder.orderNo,
    customerId: customer._id,
    idempotencyKey: "seed-demo-order",
    deliveryAddress: {
      recipientName: seedDemoOrder.customerName,
      phone: seedDemoOrder.phone,
      line1: "No. 12, Temple Road",
      city: "Kandy",
      district: "Kandy",
    },
    subtotalCents: subtotal,
    deliveryCents: delivery,
    totalCents: subtotal + delivery,
    status: "in_progress",
    packages,
    placedAt,
  });
  await PaymentModel.create({
    orderId: order._id,
    amountCents: subtotal + delivery,
    perPackage: packages.map((p) => ({ packageId: p._id, amountCents: p.subtotalCents + p.deliveryCents })),
  });

  const ev = (
    packageId: Types.ObjectId | null,
    fromStatus: string | null,
    toStatus: string,
    hoursAfter: number,
    note: string,
    actorRole: "customer" | "seller" | "admin",
  ) => ({
    orderId: order._id,
    packageId,
    fromStatus,
    toStatus,
    actorRole,
    note,
    createdAt: new Date(placedAt.getTime() + hoursAfter * 3_600_000),
  });
  const [pkg1, pkg2] = packages;
  if (!pkg1 || !pkg2) throw new Error("Demo order needs two packages");
  // Raw insert keeps the historical createdAt values (Mongoose timestamps would overwrite them).
  await OrderEventModel.collection.insertMany([
    ev(null, null, "pending", 0, "Order placed — Cash on Delivery", "customer"),
    ev(pkg1._id, "pending", "confirmed", 2, "Accepted by iStore Colombo", "seller"),
    ev(pkg2._id, "pending", "confirmed", 3, "Accepted by PC Forge", "seller"),
    ev(pkg1._id, "confirmed", "processing", 20, "Packed, IMEI recorded", "seller"),
    ev(pkg2._id, "confirmed", "processing", 26, "Being packed", "seller"),
    ev(pkg1._id, "processing", "ready_to_ship", 30, "Ready for courier pickup", "seller"),
    ev(pkg1._id, "ready_to_ship", "shipped", 48, "Handed to Prompt Xpress", "admin"),
  ]);
  await CounterModel.updateOne({ _id: "order:2026" }, { $max: { seq: 123 } }, { upsert: true });

  const counts: Record<string, number> = {};
  for (const m of [
    UserModel,
    SellerModel,
    CategoryModel,
    BrandModel,
    ProductModel,
    InventoryModel,
    OrderModel,
    OrderEventModel,
  ]) {
    counts[m.collection.collectionName] = await m.countDocuments();
  }
  return { accounts, counts };
}
