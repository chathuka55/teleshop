import Link from "next/link";
import type { CSSProperties } from "react";
import { brandLogos } from "@/config/brand-logos";
import type { BrandDTO } from "@/modules/catalog/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BrandMarquee } from "./BrandMarquee";

/**
 * Figma "Top Brands" (7:940) as two endless logo rows sliding in opposite directions. Logos are
 * the brands' official marks (Simple Icons, src/config/brand-logos.ts), white at rest and in the
 * brand's own colour on hover; a brand without a logo shows its name as a wordmark.
 */
export function TopBrands({ brands }: { brands: BrandDTO[] }) {
  if (brands.length === 0) return null;
  const rows = [brands.filter((_, i) => i % 2 === 0), brands.filter((_, i) => i % 2 === 1)];
  return (
    <section className="pt-14 md:pt-[88px]">
      <div className="container-page">
        <SectionHeader
          eyebrow="Official & authorised"
          title="Top brands"
          description="Genuine products from the names you trust, sold by verified Sri Lankan shops."
          action={{ label: "All brands", href: "/shop" }}
        />
      </div>
      <div
        data-reveal
        className="flex flex-col gap-3 [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)] md:gap-4"
      >
        {rows.map(
          (row, i) =>
            row.length > 0 && (
              <BrandMarquee key={i} reverse={i === 1} seconds={i === 1 ? 44 : 38}>
                {row.map((b) => (
                  <BrandTile key={b.id} brand={b} />
                ))}
              </BrandMarquee>
            ),
        )}
      </div>
    </section>
  );
}

/**
 * Logo height for a given width:height ratio, so a square mark and a long wordmark carry about the
 * same visual weight (a fixed height makes wordmarks huge, a fixed width makes them thin).
 */
function logoHeight(viewBox: string): number {
  const [, , w = 1, h = 1] = viewBox.split(" ").map(Number);
  return Math.round(30 * (w / h) ** -0.35);
}

function BrandTile({ brand }: { brand: BrandDTO }) {
  const logo = brandLogos[brand.slug];
  return (
    <Link
      href={`/shop?brand=${brand.slug}`}
      aria-label={`Shop ${brand.name}`}
      style={logo?.color ? ({ "--brand": logo.color } as CSSProperties) : undefined}
      className="group grid h-[68px] w-[148px] shrink-0 place-items-center rounded-2xl border border-white/7 bg-surface px-6 text-text-secondary transition-[color,border-color,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/5 hover:text-[var(--brand,var(--color-text))] focus-visible:text-[var(--brand,var(--color-text))] md:h-[84px] md:w-[184px]"
    >
      {logo ? (
        <svg
          viewBox={logo.viewBox}
          aria-hidden
          style={{ "--h": `${logoHeight(logo.viewBox)}px` } as CSSProperties}
          className="h-[calc(var(--h)*0.82)] w-auto max-w-full fill-current transition-transform duration-300 ease-out group-hover:scale-110 md:h-(--h)"
        >
          <path d={logo.path} />
        </svg>
      ) : (
        <span aria-hidden className="font-display text-lg font-bold tracking-tight md:text-xl">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
