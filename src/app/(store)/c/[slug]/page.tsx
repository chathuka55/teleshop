import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/product/ProductListing";
import { getCategory, listBrands, searchProducts } from "@/modules/catalog/service";
import { parseProductQuery, type RawSearchParams } from "@/modules/catalog/schema";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} from verified Sri Lankan shops. Compare specs and pay cash on delivery.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const query = parseProductQuery(await searchParams, category.slug, category.specFilters);
  const [page, brands] = await Promise.all([searchProducts(query), listBrands()]);

  return (
    <ProductListing
      title={category.name}
      subtitle={`${category.productCount.toLocaleString("en-LK")} products from verified shops`}
      crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]}
      basePath={`/c/${category.slug}`}
      query={query}
      page={page}
      brands={brands}
      specFilters={category.specFilters}
    />
  );
}
