import type { Types } from "mongoose";
import type { BrandDTO } from "@/modules/catalog/types";
import { connectDB } from "../mongoose";
import { BrandModel } from "../models/brand.model";
import type { LeanBrand } from "./catalog-mappers";
import { $in } from "../operators";

const toBrandDTO = (b: LeanBrand): BrandDTO => ({ id: b._id.toString(), slug: b.slug, name: b.name });

export async function listActiveBrands(): Promise<BrandDTO[]> {
  await connectDB();
  // Insertion order = curated order (Figma "Top brands").
  const brands = await BrandModel.find({ isActive: true }).sort({ _id: 1 }).lean<LeanBrand[]>();
  return brands.map(toBrandDTO);
}

export async function findLeanBrands(filter: {
  ids?: Types.ObjectId[];
  slugs?: string[];
}): Promise<LeanBrand[]> {
  await connectDB();
  if (filter.ids) return BrandModel.find({ _id: $in(filter.ids) }).lean<LeanBrand[]>();
  if (filter.slugs) return BrandModel.find({ slug: $in(filter.slugs) }).lean<LeanBrand[]>();
  return [];
}
