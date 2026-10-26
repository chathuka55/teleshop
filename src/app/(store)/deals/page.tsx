import type { Metadata } from "next";
import { ProductListing } from "@/components/product/ProductListing";
import { DEALS_HREF } from "@/config/site";
import { listBrands, searchProducts } from "@/modules/catalog/service";
import { parseProductQuery, type RawSearchParams } from "@/modules/catalog/schema";

export const metadata: Metadata = {
  title: "Deals",
  description: "Discounted phones, laptops, PC parts and accessories from verified Sri Lankan shops.",
};

/** Deals: only discounted products, biggest discount first unless the shopper picks a sort. */
export default async function DealsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const parsed = parseProductQuery(raw);
  const query = { ...parsed, deals: true, sort: raw.sort ? parsed.sort : "discount" } as const;
  const [page, brands] = await Promise.all([searchProducts(query), listBrands()]);

  return (
    <ProductListing
      title={query.q ? `Deals for “${query.q}”` : "Deals"}
      subtitle={`${page.total.toLocaleString("en-LK")} discounted products from verified shops`}
      crumbs={[{ label: "Home", href: "/" }, { label: "Deals" }]}
      basePath={DEALS_HREF}
      query={query}
      page={page}
      brands={brands}
    />
  );
}
