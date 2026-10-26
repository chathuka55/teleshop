import type { PipelineStage, Types } from "mongoose";
import type { ProductCardDTO, ProductDetailDTO, ProductPage, ProductQuery } from "@/modules/catalog/types";
import { connectDB } from "../mongoose";
import { InventoryModel } from "../models/inventory.model";
import { ProductModel } from "../models/product.model";
import { findLeanBrands } from "./brand.repository";
import { toProductCardDTO, toProductDetailDTO, type LeanProduct } from "./catalog-mappers";
import { findLeanCategories } from "./category.repository";
import { findLeanSellers } from "./seller.repository";
import { $gt, $in } from "../operators";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

/** Load categories / brands / sellers / stock for a batch of products (no N+1). */
async function lookupsFor(products: LeanProduct[], withStock: boolean) {
  const uniq = <T extends { toString(): string }>(xs: T[]): T[] => [
    ...new Map(xs.map((x) => [x.toString(), x])).values(),
  ];
  const [categories, brands, sellers, stockRows] = await Promise.all([
    findLeanCategories({ ids: uniq(products.map((p) => p.categoryId)) }),
    findLeanBrands({ ids: uniq(products.map((p) => p.brandId)) }),
    findLeanSellers({ ids: uniq(products.map((p) => p.sellerId)) }),
    withStock
      ? InventoryModel.find({ sku: $in(products.flatMap((p) => p.variants.map((v) => v.sku))) })
          .select("sku available")
          .lean<{ sku: string; available: number }[]>()
      : Promise.resolve([]),
  ]);
  return {
    categories: new Map(categories.map((c) => [c._id.toString(), c])),
    brands: new Map(brands.map((b) => [b._id.toString(), b])),
    sellers: new Map(sellers.map((s) => [s._id.toString(), s])),
    stock: new Map(stockRows.map((r) => [r.sku, r.available])),
  };
}

const SORTS: Record<NonNullable<ProductQuery["sort"]>, Record<string, 1 | -1>> = {
  featured: { _id: 1 },
  price_asc: { basePriceCents: 1, _id: 1 },
  price_desc: { basePriceCents: -1, _id: 1 },
  rating: { "rating.average": -1, "rating.count": -1, _id: 1 },
  newest: { publishedAt: -1, _id: 1 },
  discount: { discountScore: -1, _id: 1 },
};

/**
 * Storefront search (docs/09 GET /products). Input is a Zod-validated `ProductQuery`;
 * filters are built here from known fields only — never from raw request objects.
 * Cursor = offset into the sorted result (opaque to clients).
 */
export async function searchPublishedProducts(query: ProductQuery): Promise<ProductPage> {
  await connectDB();

  const match: Record<string, unknown> = { status: "published" };
  if (query.category) {
    const [cat] = await findLeanCategories({ slugs: [query.category] });
    if (!cat) return { items: [], total: 0, nextCursor: null };
    match.categoryId = cat._id;
  }
  if (query.brand?.length) {
    const brands = await findLeanBrands({ slugs: query.brand });
    match.brandId = { $in: brands.map((b) => b._id) };
  }
  if (query.seller) {
    const [seller] = await findLeanSellers({ slugs: [query.seller] });
    if (!seller) return { items: [], total: 0, nextCursor: null };
    match.sellerId = seller._id;
  }
  if (query.condition?.length) match.condition = { $in: query.condition };
  if (query.minPriceCents !== undefined || query.maxPriceCents !== undefined) {
    match.basePriceCents = {
      ...(query.minPriceCents !== undefined ? { $gte: query.minPriceCents } : {}),
      ...(query.maxPriceCents !== undefined ? { $lte: query.maxPriceCents } : {}),
    };
  }
  if (query.specs) {
    // AND across specs, OR within one spec. A value matches the product spec when it starts with
    // the option ("1TB" ↔ "1TB SSD") or any variant has it ("512GB" storage variant). Keys and
    // values are allow-listed category options (parseSpecFilters), so the regex is built from
    // trusted strings only.
    const escape = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$and = Object.entries(query.specs).map(([key, values]) => ({
      $or: [
        {
          [`specs.${key}`]: {
            // eslint-disable-next-line security/detect-non-literal-regexp -- allow-listed option, escaped
            $in: values.map((v) => new RegExp(`^${escape(v)}(?![0-9a-z])`, "i")),
          },
        },
        { [`variants.attributes.${key}`]: { $in: values } },
      ],
    }));
  }
  if (query.inStock) {
    const ids = await InventoryModel.distinct("productId", { available: $gt(0) });
    match._id = { $in: ids };
  }

  const sortKey = query.sort ?? "featured";
  const pipeline: PipelineStage[] = [];
  if (query.q) pipeline.push({ $match: { $text: { $search: query.q } } });
  pipeline.push({ $match: match });
  if (sortKey === "discount" || query.deals) {
    pipeline.push({
      $addFields: {
        discountScore: {
          $max: {
            $map: {
              input: "$variants",
              as: "v",
              in: {
                $cond: [
                  { $gt: ["$$v.compareAtCents", "$$v.priceCents"] },
                  {
                    $divide: [{ $subtract: ["$$v.compareAtCents", "$$v.priceCents"] }, "$$v.compareAtCents"],
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    });
  }
  if (query.deals) pipeline.push({ $match: { discountScore: { $gt: 0 } } });
  pipeline.push({
    $sort: query.q && sortKey === "featured" ? { score: { $meta: "textScore" }, _id: 1 } : SORTS[sortKey],
  });

  const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const start = query.cursor ? Number(query.cursor) : 0;
  pipeline.push({
    $facet: {
      items: [{ $skip: start }, { $limit: limit }],
      total: [{ $count: "n" }],
    },
  });

  const [result] = await ProductModel.aggregate<{ items: LeanProduct[]; total: { n: number }[] }>(pipeline);
  const items = result?.items ?? [];
  const total = result?.total[0]?.n ?? 0;
  const l = await lookupsFor(items, false);
  const next = start + limit;
  return {
    items: items.map((p) => toProductCardDTO(p, l)),
    total,
    nextCursor: next < total ? String(next) : null,
  };
}

export async function findPublishedProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  await connectDB();
  const p = await ProductModel.findOne({ slug, status: "published" }).lean<LeanProduct>();
  if (!p) return null;
  return toProductDetailDTO(p, await lookupsFor([p], true));
}

export async function findPublishedProductsBySlugs(slugs: readonly string[]): Promise<ProductDetailDTO[]> {
  if (!slugs.length) return [];
  await connectDB();
  const docs = await ProductModel.find({ status: "published", slug: $in(slugs) }).lean<LeanProduct[]>();
  const l = await lookupsFor(docs, true);
  // keep the caller's order (compare page)
  return slugs.flatMap((s) => docs.filter((d) => d.slug === s)).map((p) => toProductDetailDTO(p, l));
}

/** Published product cards by id, in the caller's order (wishlist). Unknown ids are skipped. */
export async function findPublishedProductCardsByIds(ids: readonly string[]): Promise<ProductCardDTO[]> {
  const valid = ids.filter((id) => /^[a-f0-9]{24}$/.test(id));
  if (!valid.length) return [];
  await connectDB();
  const docs = await ProductModel.find({ status: "published", _id: $in(valid) }).lean<LeanProduct[]>();
  const l = await lookupsFor(docs, false);
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return valid.flatMap((id) => {
    const d = byId.get(id);
    return d ? [toProductCardDTO(d, l)] : [];
  });
}

/** Products containing any of the SKUs — used to re-price carts on the server. */
export async function findPublishedProductsBySkus(skus: readonly string[]): Promise<ProductDetailDTO[]> {
  if (!skus.length) return [];
  await connectDB();
  const docs = await ProductModel.find({ status: "published", "variants.sku": $in(skus) }).lean<
    LeanProduct[]
  >();
  const l = await lookupsFor(docs, true);
  return docs.map((p) => toProductDetailDTO(p, l));
}

export async function listFeaturedProducts(limit = 12): Promise<ProductCardDTO[]> {
  const page = await searchPublishedProducts({ sort: "featured", limit });
  return page.items;
}

export async function listRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 4,
): Promise<ProductCardDTO[]> {
  const same = await searchPublishedProducts({ category: categorySlug, sort: "rating", limit: limit + 1 });
  const items = same.items.filter((p) => p.id !== productId);
  if (items.length >= limit) return items.slice(0, limit);
  const more = await searchPublishedProducts({ sort: "rating", limit: limit * 2 });
  const seen = new Set([productId, ...items.map((p) => p.id)]);
  return [...items, ...more.items.filter((p) => !seen.has(p.id))].slice(0, limit);
}

export async function listPublishedSlugs(): Promise<string[]> {
  await connectDB();
  const rows = await ProductModel.find({ status: "published" })
    .select("slug")
    .lean<{ slug: string; _id: Types.ObjectId }[]>();
  return rows.map((r) => r.slug);
}
