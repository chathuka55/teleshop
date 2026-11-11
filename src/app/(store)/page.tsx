import { Suspense } from "react";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Newsletter } from "@/components/home/Newsletter";
import { PromoBanners } from "@/components/home/PromoBanners";
import { SectionSkeleton } from "@/components/home/SectionSkeleton";
import { TopBrands } from "@/components/home/TopBrands";
import { SellerCard } from "@/components/product/SellerCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  listBrands,
  listCategories,
  listFeaturedProducts,
  listFeaturedSellers,
} from "@/modules/catalog/service";

/**
 * Figma "01 · Home — Guest" (7:307) / "M1 · Mobile — Home" (24:2648).
 *
 * The page itself awaits nothing (P8-T02): the hero — the LCP element — goes out in the first
 * flush, and each section that needs the database streams into its own Suspense boundary. Awaiting
 * the data here instead made the whole page fall back to `loading.tsx` on a full load, and the
 * swap to the real page shifted the layout (CLS 1.0).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<SectionSkeleton className="h-[420px] md:h-[440px]" />}>
        <Categories />
      </Suspense>
      <Suspense fallback={<SectionSkeleton className="h-[900px] md:h-[1040px]" />}>
        <Featured />
      </Suspense>
      <PromoBanners />
      <Suspense fallback={<SectionSkeleton className="h-[360px]" />}>
        <Brands />
      </Suspense>
      <Suspense fallback={<SectionSkeleton className="h-[640px] md:h-[420px]" />}>
        <Sellers />
      </Suspense>
      <HowItWorks />
      <Newsletter />
    </>
  );
}

async function Categories() {
  return <CategoryGrid categories={await listCategories()} />;
}

async function Featured() {
  return <FeaturedProducts products={await listFeaturedProducts(12)} />;
}

async function Brands() {
  return <TopBrands brands={await listBrands()} />;
}

async function Sellers() {
  const sellers = await listFeaturedSellers(3);
  return (
    <section className="container-page pt-14 md:pt-[88px]">
      <SectionHeader
        eyebrow="Verified sellers"
        title="Featured tech shops"
        description="Trusted mobile and computer shops selling on Teleshop."
        action={{ label: "All sellers", href: "/sellers" }}
      />
      <ul data-reveal="stagger" className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {sellers.map((s) => (
          <li key={s.id}>
            <SellerCard seller={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}
