"use client";

import Image from "next/image";
import { useState, type PointerEvent } from "react";
import type { ProductDetailDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";
import { ProductArt } from "./ProductArt";

const TINTS = ["orange", "blue", "silver", "amber"] as const;

/**
 * Gallery with thumbnails (Figma 03 left column). Shows the product photos when there are any;
 * without photos the thumbnails show the device art in each finish.
 */
export function ProductGallery({ product }: { product: ProductDetailDTO }) {
  return product.images.length > 0 ? <PhotoGallery product={product} /> : <ArtGallery product={product} />;
}

/** Zoom factor for the hover / tap magnifier. */
const ZOOM = 2.2;

type ZoomPoint = { x: number; y: number };

function pointIn(e: PointerEvent<HTMLElement>): ZoomPoint {
  const r = e.currentTarget.getBoundingClientRect();
  const clamp = (v: number): number => Math.min(100, Math.max(0, v));
  return {
    x: clamp(((e.clientX - r.left) / r.width) * 100),
    y: clamp(((e.clientY - r.top) / r.height) * 100),
  };
}

function PhotoGallery({ product }: { product: ProductDetailDTO }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<ZoomPoint | null>(null);
  const image = product.images[active] ?? product.images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Mouse: magnifies under the cursor while hovering. Touch: tap to zoom in / out. */}
      <div
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-[22px] border border-white/7 bg-linear-to-b from-surface-2 to-[#0e121a] md:aspect-[4/3.6]"
        onPointerMove={(e) => e.pointerType === "mouse" && setZoom(pointIn(e))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setZoom(null)}
        onPointerUp={(e) => e.pointerType !== "mouse" && setZoom((z) => (z ? null : pointIn(e)))}
      >
        {image && (
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            fill
            priority={active === 0}
            sizes="(min-width: 1024px) 1000px, 100vw"
            className="object-contain p-6 drop-shadow-[0_24px_40px_rgb(0_0_0/0.45)] transition-transform duration-200 ease-out md:p-10"
            style={{
              transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%",
              transform: zoom ? `scale(${ZOOM})` : undefined,
            }}
          />
        )}
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/80">
          {zoom ? "Move to explore" : "Hover or tap to zoom"}
        </span>
      </div>
      {product.images.length > 1 && (
        <div role="tablist" aria-label="Product images" className="grid grid-cols-4 gap-3">
          {product.images.slice(0, 8).map((img, i) => (
            <button
              key={img.url}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-label={`Image ${i + 1}`}
              onClick={() => {
                setActive(i);
                setZoom(null);
              }}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-2xl border-2 bg-surface-2 transition-colors",
                i === active ? "border-primary-light" : "border-transparent hover:border-white/15",
              )}
            >
              <Image src={img.url} alt="" fill sizes="150px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtGallery({ product }: { product: ProductDetailDTO }) {
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
