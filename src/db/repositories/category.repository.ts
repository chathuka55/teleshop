import type { Types } from "mongoose";
import type { CategoryDTO } from "@/modules/catalog/types";
import { connectDB } from "../mongoose";
import { CategoryModel } from "../models/category.model";
import { ProductModel } from "../models/product.model";
import { toCategoryDTO, type LeanCategory } from "./catalog-mappers";
import { liveProductFilter } from "./storefront-filter";
import { $in } from "../operators";

/** Published product count per category id. */
async function countsByCategory(): Promise<Map<string, number>> {
  const rows = await ProductModel.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: await liveProductFilter() },
    { $group: { _id: "$categoryId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.n]));
}

export async function listActiveCategories(): Promise<CategoryDTO[]> {
  await connectDB();
  const [categories, counts] = await Promise.all([
    CategoryModel.find({ isActive: true, parentId: null })
      .sort({ sortOrder: 1, name: 1 })
      .lean<LeanCategory[]>(),
    countsByCategory(),
  ]);
  return categories.map((c) => toCategoryDTO(c, counts.get(c._id.toString()) ?? 0));
}

export async function findCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  await connectDB();
  const c = await CategoryModel.findOne({ slug, isActive: true }).lean<LeanCategory>();
  if (!c) return null;
  const n = await ProductModel.countDocuments({ ...(await liveProductFilter()), categoryId: c._id });
  return toCategoryDTO(c, n);
}

/** Internal: raw category docs by id or slug (for product hydration and filters). */
export async function findLeanCategories(filter: {
  ids?: Types.ObjectId[];
  slugs?: string[];
}): Promise<LeanCategory[]> {
  await connectDB();
  if (filter.ids) return CategoryModel.find({ _id: $in(filter.ids) }).lean<LeanCategory[]>();
  if (filter.slugs) return CategoryModel.find({ slug: $in(filter.slugs) }).lean<LeanCategory[]>();
  return [];
}
