"use client";

import { useState } from "react";
import type { ProductCardDTO } from "@/modules/catalog/types";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { id: "all", label: "All", categories: null },
  { id: "phones", label: "Phones", categories: ["mobile-phones"] },
  { id: "laptops", label: "Laptops", categories: ["laptops"] },
  { id: "audio", label: "Audio", categories: ["audio"] },
  { id: "accessories", label: "Accessories", categories: ["wearables", "pc-components", "networking"] },
] as const;

/** Figma "Featured Products" (7:625). Tabs filter the server-provided list on the client. */
export function FeaturedProducts({ products }: { products: ProductCardDTO[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");
  const active = tabs.find((t) => t.id === tab);
  const cats: readonly string[] | null = active?.categories ?? null;
  const visible = (cats ? products.filter((p) => cats.includes(p.category.slug)) : products).slice(0, 8);

  return (
    <section className="container-page pt-14 md:pt-[88px]">
      <SectionHeader
        eyebrow="Handpicked"
        title="Featured products"
        description="Trending picks from verified shops this week."
      >
        <div
          role="tablist"
          aria-label="Filter featured products"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={t.id === tab}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-[34px] shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors",
                t.id === tab
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-white/4 text-text-secondary hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </SectionHeader>

      {visible.length ? (
        <ul className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {visible.map((p) => (
            <li key={p.id} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <ProductCard product={p} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[20px] border border-line bg-surface p-10 text-center text-text-secondary">
          No featured products in this category yet.
        </p>
      )}
    </section>
  );
}
