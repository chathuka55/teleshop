import "server-only";
import { unstable_cache } from "next/cache";
import { listActiveBrands } from "@/db/repositories/brand.repository";
import { findCategoryBySlug, listActiveCategories } from "@/db/repositories/category.repository";
import {
  findPublishedProductBySlug,
  findPublishedProductsBySkus,
  findPublishedProductsBySlugs,
  listFeaturedProducts as repoFeatured,
  listPublishedSlugs,
  listRelatedProducts as repoRelated,
  searchPublishedProducts,
} from "@/db/repositories/product.repository";
import {
  findApprovedSellerBySlug,
  findApprovedSellerProfileBySlug,
  listApprovedSellers,
} from "@/db/repositories/seller.repository";
import type {
  BrandDTO,
  CategoryDTO,
  ProductCardDTO,
  ProductDetailDTO,
  ProductPage,
  ProductQuery,
  SellerCardDTO,
  SellerProfileDTO,
} from "./types";

/**
 * Catalogue read service for storefront pages (public data only: published products,
 * approved sellers, active categories). Writes arrive with the seller portal (Phase 6).
 */

export async function listCategories(): Promise<CategoryDTO[]> {
  return listActiveCategories();
}

/** Categories for the navbar dropdown / drawer — cached 5 min so page views don't hit the DB. */
export const listNavCategories: () => Promise<CategoryDTO[]> = unstable_cache(
  () => listActiveCategories(),
  ["nav-categories"],
  { revalidate: 300, tags: ["categories"] },
);

export async function getCategory(slug: string): Promise<CategoryDTO | null> {
  return findCategoryBySlug(slug);
}

export async function listBrands(): Promise<BrandDTO[]> {
  return listActiveBrands();
}

export async function listFeaturedSellers(limit = 3): Promise<SellerCardDTO[]> {
  return listApprovedSellers(limit);
}

export async function listSellers(): Promise<SellerCardDTO[]> {
  return listApprovedSellers();
}

export async function getSeller(slug: string): Promise<SellerCardDTO | null> {
  return findApprovedSellerBySlug(slug);
}

/** Public shop page data (/s/[shop]). */
export async function getSellerProfile(slug: string): Promise<SellerProfileDTO | null> {
  return findApprovedSellerProfileBySlug(slug);
}

export async function listFeaturedProducts(limit = 12): Promise<ProductCardDTO[]> {
  return repoFeatured(limit);
}

export async function searchProducts(query: ProductQuery): Promise<ProductPage> {
  return searchPublishedProducts(query);
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  return findPublishedProductBySlug(slug);
}

export async function getProductsBySlugs(slugs: readonly string[]): Promise<ProductDetailDTO[]> {
  return findPublishedProductsBySlugs(slugs);
}

export async function getProductsBySkus(skus: readonly string[]): Promise<ProductDetailDTO[]> {
  return findPublishedProductsBySkus(skus);
}

export async function listRelatedProducts(product: ProductDetailDTO, limit = 4): Promise<ProductCardDTO[]> {
  return repoRelated(product.id, product.category.slug, limit);
}

export async function listProductSlugs(): Promise<string[]> {
  return listPublishedSlugs();
}
