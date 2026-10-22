import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CategoryDTO } from "@/modules/catalog/types";
import { CategoryIcon } from "@/components/product/CategoryIcon";
import { SectionHeader } from "@/components/ui/SectionHeader";

/** Figma "Shop by Category" (7:523) — 4×2 tiles on desktop, icon grid on phones (M1). */
export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  return (
    <section id="categories" className="container-page pt-14 md:pt-[88px]">
      <SectionHeader
        eyebrow="Browse"
        title="Shop by category"
        description="Everything tech, organised the way you shop."
        action={{ label: "All categories", href: "/shop" }}
      />
      <ul className="grid grid-cols-4 gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/c/${c.slug}`}
              className="group flex flex-col items-center gap-2 text-center md:flex-row md:gap-4 md:rounded-[20px] md:border md:border-white/7 md:bg-surface md:p-5 md:text-left md:transition-colors md:hover:border-primary-light/40"
            >
              <span className="grid size-16 place-items-center rounded-[18px] border border-primary/25 bg-primary/12 text-primary-light md:size-14 md:rounded-2xl md:border-0">
                <CategoryIcon icon={c.icon} className="size-6 md:size-[26px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-text-secondary md:text-base md:font-semibold md:text-text">
                  {c.name}
                </span>
                <span className="hidden text-[13px] text-text-secondary md:block">
                  {c.productCount.toLocaleString("en-LK")} products
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="hidden size-[18px] text-text-muted transition-transform group-hover:translate-x-0.5 md:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
