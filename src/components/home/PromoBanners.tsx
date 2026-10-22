import { ArrowRight, Cpu, RefreshCw } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/** Figma "Promo Banners" (7:907). */
export function PromoBanners() {
  return (
    <section className="container-page grid gap-4 pt-14 md:grid-cols-2 md:gap-5 md:pt-[88px]">
      <article
        className="relative isolate flex min-h-[220px] flex-col justify-center gap-3.5 overflow-hidden rounded-[26px] border border-white/10 p-6 md:h-[280px] md:p-10"
        style={{ backgroundImage: "linear-gradient(156deg, #1d4ed8 0%, #3b82f6 71%)" }}
      >
        <Cpu
          aria-hidden
          strokeWidth={1}
          className="absolute top-5 right-[-30px] -z-10 size-[260px] text-white/18"
        />
        <Badge tone="onColor" size="sm" className="self-start">
          PC BUILD WEEK
        </Badge>
        <h2 className="font-display text-[26px] font-bold md:text-[34px]">Build your dream rig</h2>
        <p className="max-w-[360px] text-[15px] leading-normal text-white/80">
          Up to 20% off GPUs, CPUs &amp; SSDs from top PC shops.
        </p>
        <ButtonLink
          href="/c/pc-components"
          variant="light"
          size="sm"
          className="h-[41px] self-start px-5 text-sm font-bold"
        >
          Shop components
          <ArrowRight aria-hidden className="size-4!" />
        </ButtonLink>
      </article>

      <article
        className="relative isolate flex min-h-[220px] flex-col justify-center gap-3.5 overflow-hidden rounded-[26px] border border-white/10 p-6 md:h-[280px] md:p-10"
        style={{ backgroundImage: "linear-gradient(156deg, #b45309 0%, #f59e0b 71%)" }}
      >
        <RefreshCw
          aria-hidden
          strokeWidth={1}
          className="absolute top-5 right-[-30px] -z-10 size-[260px] text-white/18"
        />
        <Badge tone="onColor" size="sm" className="self-start bg-white/8 text-text">
          CERTIFIED REFURBISHED
        </Badge>
        <h2 className="font-display text-[26px] font-bold md:text-[34px]">Like new. Half the price.</h2>
        <p className="max-w-[360px] text-[15px] leading-normal text-text/80">
          Inspected phones &amp; laptops with 6-month shop warranty.
        </p>
        <ButtonLink
          href="/shop?condition=refurbished"
          variant="light"
          size="sm"
          className="h-[41px] self-start px-5 text-sm font-bold"
        >
          Explore refurbished
          <ArrowRight aria-hidden className="size-4!" />
        </ButtonLink>
      </article>
    </section>
  );
}
