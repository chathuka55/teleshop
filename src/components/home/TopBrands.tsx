import Link from "next/link";
import type { BrandDTO } from "@/modules/catalog/types";
import { SectionHeader } from "@/components/ui/SectionHeader";

/** Figma "Top Brands" (7:940). */
export function TopBrands({ brands }: { brands: BrandDTO[] }) {
  return (
    <section className="container-page pt-14 md:pt-[88px]">
      <SectionHeader
        eyebrow="Official & authorised"
        title="Top brands"
        action={{ label: "All brands", href: "/shop" }}
      />
      <ul className="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-3.5">
        {brands.slice(0, 12).map((b) => (
          <li key={b.id}>
            <Link
              href={`/shop?brand=${b.slug}`}
              className="grid h-14 place-items-center rounded-2xl border border-white/7 bg-surface font-display text-lg font-bold text-text-secondary transition-colors hover:border-white/15 hover:text-text md:h-[68px] md:text-[22px]"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
