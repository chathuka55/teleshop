import type { Metadata } from "next";
import { ProductListing } from "@/components/product/ProductListing";
import { listBrands, searchProducts } from "@/modules/catalog/service";
import { parseProductQuery, type RawSearchParams } from "@/modules/catalog/schema";

export const metadata: Metadata = {
  title: "Shop all tech",
  description: "Phones, laptops, PC parts and accessories from verified Sri Lankan shops. Cash on delivery.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseProductQuery(await searchParams);
  const [page, brands] = await Promise.all([searchProducts(query), listBrands()]);

  return (
    <ProductListing
      title={query.q ? `Results for “${query.q}”` : "All products"}
      subtitle={`${page.total.toLocaleString("en-LK")} products from verified shops`}
      crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      basePath="/shop"
      query={query}
      page={page}
      brands={brands}
    />
  );
}
