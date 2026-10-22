import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Newsletter } from "@/components/home/Newsletter";
import { PromoBanners } from "@/components/home/PromoBanners";
import { TopBrands } from "@/components/home/TopBrands";
import { SellerCard } from "@/components/product/SellerCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  listBrands,
  listCategories,
  listFeaturedProducts,
  listFeaturedSellers,
} from "@/modules/catalog/service";

/** Figma "01 · Home — Guest" (7:307) / "M1 · Mobile — Home" (24:2648). */
export default async function HomePage() {
  const [categories, products, brands, sellers] = await Promise.all([
    listCategories(),
    listFeaturedProducts(12),
    listBrands(),
    listFeaturedSellers(3),
  ]);

  return (
    <>
      <Hero />
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={products} />
      <PromoBanners />
      <TopBrands brands={brands} />
      <section className="container-page pt-14 md:pt-[88px]">
        <SectionHeader
          eyebrow="Verified sellers"
          title="Featured tech shops"
          description="Trusted mobile and computer shops selling on Teleshop."
          action={{ label: "All sellers", href: "/sellers" }}
        />
        <ul className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {sellers.map((s) => (
            <li key={s.id}>
              <SellerCard seller={s} />
            </li>
          ))}
        </ul>
      </section>
      <HowItWorks />
      <Newsletter />
    </>
  );
}
