import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listCategories, listProductSlugs, listSellers } from "@/modules/catalog/service";

// Built per request from the database (no DB at build time in CI).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [categories, products, sellers] = await Promise.all([
    listCategories(),
    listProductSlugs(),
    listSellers(),
  ]);
  const staticPaths = [
    "",
    "/shop",
    "/sellers",
    "/about",
    "/contact",
    "/help",
    "/track",
    "/legal/terms",
    "/legal/privacy",
  ];
  return [
    ...staticPaths.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.6,
    })),
    ...categories.map((c) => ({
      url: `${base}/c/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((slug) => ({
      url: `${base}/p/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...sellers.map((s) => ({
      url: `${base}/s/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
