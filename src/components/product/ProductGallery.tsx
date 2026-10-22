"use client";

import { useState } from "react";
import type { ProductDetailDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";
import { ProductArt } from "./ProductArt";

const TINTS = ["orange", "blue", "silver", "amber"] as const;

/**
 * Gallery with thumbnails (Figma 03 left column). With no uploaded images yet, the
 * thumbnails show the device art in each finish.
 */
export function ProductGallery({ product }: { product: ProductDetailDTO }) {
  const views = [product.art.tint, ...TINTS.filter((t) => t !== product.art.tint)].slice(0, 4);
  const [active, setActive] = useState(0);
  const tint = views[active] ?? product.art.tint;

  return (
    <div className="flex flex-col gap-3">
      <ProductArt
        product={{ ...product, art: { ...product.art, tint } }}
        size="lg"
        priority
        className="aspect-square w-full rounded-[22px] border border-white/7 md:aspect-[4/3.6]"
      />
      <div role="tablist" aria-label="Product images" className="grid grid-cols-4 gap-3">
        {views.map((t, i) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-label={`Image ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "overflow-hidden rounded-2xl border-2 transition-colors",
              i === active ? "border-primary-light" : "border-transparent hover:border-white/15",
            )}
          >
            <ProductArt
              product={{ ...product, art: { ...product.art, tint: t } }}
              artScale={0.5}
              className="pointer-events-none aspect-[4/3] w-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
