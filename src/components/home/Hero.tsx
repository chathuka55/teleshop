import { ArrowRight, ShieldCheck, ShoppingCart, Store, Truck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/product/Rating";
import { HeroModelSlider } from "@/components/three/HeroModelSlider";
import { HeroMotion } from "./HeroMotion";
import { TrustStrip } from "./TrustStrip";

const stats = [
  { value: "120+", label: "Verified shops" },
  { value: "15K+", label: "Products listed" },
  { value: "25", label: "Districts with COD" },
] as const;

/** Figma "Hero" (7:308): copy on the left, 3D slider + glass float cards on the right. */
export function Hero() {
  return (
    <section
      data-hero
      className="relative isolate -mt-[74px] overflow-hidden pt-[74px] md:-mt-[82px] md:pt-[82px]"
    >
      <HeroMotion />
      <HeroBackdrop />

      <div className="container-page grid items-center gap-4 pt-6 pb-6 sm:gap-8 sm:pt-8 sm:pb-10 lg:grid-cols-[minmax(0,640px)_minmax(0,600px)] lg:justify-between lg:gap-10 lg:pt-12 lg:pb-14 2xl:max-w-[1376px]! 2xl:grid-cols-[minmax(0,640px)_minmax(0,696px)]">
        <div data-parallax="-0.1" className="flex min-w-0 flex-col items-start gap-5 sm:gap-6 md:gap-7">
          <Link
            data-hero-item
            href="/c/mobile-phones"
            className="glass flex max-w-full items-center gap-2.5 rounded-full border-white/8 py-1.5 pr-3.5 pl-1.5 text-[12px] font-medium shadow-none backdrop-blur-[10px] hover:bg-white/10 sm:text-[13px]"
          >
            <Badge tone="primary" size="sm">
              NEW
            </Badge>
            <span className="truncate">Galaxy S26 Ultra &amp; iPhone 17 Pro now in stock</span>
            <ArrowRight aria-hidden className="size-3.5 shrink-0" />
          </Link>

          <h1
            data-hero-item
            className="font-display text-[clamp(2.25rem,10vw,2.5rem)] leading-[1.04] font-bold tracking-[-0.03em] sm:text-[56px] lg:text-[60px] 2xl:text-[70px]"
          >
            The future of tech,
            <br />
            <span className="text-gradient-brand">all in one place.</span>
          </h1>

          <p
            data-hero-item
            className="max-w-[580px] text-[15px] leading-relaxed text-text-secondary sm:text-base md:text-lg"
          >
            Shop smartphones, laptops, PC parts and accessories from verified mobile and computer shops across
            Sri Lanka. Compare real specs, pay cash on delivery and track every order live.
          </p>

          <div
            data-hero-item
            className="flex w-full flex-wrap gap-3 sm:w-auto sm:gap-3.5 [&>*]:flex-1 sm:[&>*]:flex-none"
          >
            <ButtonLink href="/shop" size="md">
              Shop Now
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="/register/seller" variant="glass" size="md">
              <Store aria-hidden />
              Become a Seller
            </ButtonLink>
          </div>

          <dl data-hero-item className="flex w-full items-start pt-1 sm:w-auto sm:items-center sm:pt-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={
                  i > 0
                    ? "ml-4 flex min-w-0 flex-col gap-0.5 border-l border-white/8 pl-4 sm:ml-6 sm:pl-6 md:ml-8 md:pl-8"
                    : "flex min-w-0 flex-col gap-0.5"
                }
              >
                <dt className="order-2 text-[12px] leading-snug text-text-secondary sm:text-[13px]">
                  {s.label}
                </dt>
                <dd
                  data-countup
                  className="order-1 font-display text-[22px] font-bold tabular-nums sm:text-2xl md:text-[30px]"
                >
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroShowcase />
      </div>

      <div className="container-page pb-10 md:pb-16">
        <TrustStrip />
      </div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        data-parallax="0.35"
        className="absolute -top-[120px] -left-[160px] size-[620px] rounded-full bg-primary/25 blur-[140px]"
      />
      <div
        data-parallax="0.22"
        className="absolute -top-[60px] right-[-20px] size-[560px] rounded-full bg-primary-light/15 blur-[140px]"
      />
      <div
        data-parallax="0.5"
        className="absolute top-[420px] left-[40%] size-[420px] rounded-full bg-accent/10 blur-[140px]"
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "80px 100%",
          maskImage: "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
        }}
      />
    </div>
  );
}

/** Right side of the hero: rings, 3D slider (product photos first) and float cards. */
function HeroShowcase() {
  return (
    <div
      data-hero-showcase
      className="relative mx-auto h-[420px] w-full max-w-[600px] sm:h-[480px] md:h-[560px] xl:h-[620px] 2xl:h-[700px] 2xl:max-w-[696px]"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 aspect-square w-[87%] -translate-1/2 rounded-full border border-white/6" />
        <div className="absolute top-1/2 left-1/2 aspect-square w-[63%] -translate-1/2 rounded-full border border-white/8" />
        <div className="absolute top-1/2 left-1/2 aspect-square w-1/2 -translate-1/2 rounded-full bg-primary/45 blur-[70px]" />
      </div>

      <HeroModelSlider className="absolute inset-0 pb-[88px]" />

      {/* Glass float cards (HTML on top of the canvas) */}
      <div
        data-hero-float
        className="glass absolute top-[12.5%] -left-2.5 hidden w-[230px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[rgb(22_163_74/0.16)]">
            <ShieldCheck aria-hidden className="size-5 text-success" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Verified Sellers</span>
            <span className="text-xs text-text-secondary">Every shop is reviewed</span>
          </span>
        </div>
      </div>

      <div
        data-hero-float
        className="glass absolute top-[17%] right-[-10px] hidden w-[190px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block"
      >
        <Stars value={5} />
        <p className="mt-2.5 text-sm font-semibold">4.9 / 5 rating</p>
        <p className="mt-2.5 text-xs text-text-secondary">from 12,400+ reviews</p>
      </div>

      <div
        data-hero-float
        className="glass absolute top-[53.5%] right-[-20px] hidden w-[210px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/16">
            <Truck aria-hidden className="size-5 text-primary-light" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Cash on Delivery</span>
            <span className="text-xs text-text-secondary">Pay when it arrives</span>
          </span>
        </div>
      </div>

      <div
        data-hero-float
        className="glass absolute top-[53.5%] left-0 hidden w-[250px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block"
      >
        <p className="text-[13px] text-text-secondary">iPhone 17 Pro · 256GB</p>
        <p className="mt-2.5 flex items-end gap-2">
          <span className="font-display text-[22px] font-bold text-primary-light">LKR 389,900</span>
          <span className="pb-0.5 text-xs text-text-muted line-through">419,900</span>
        </p>
        <ButtonLink
          href="/p/apple-iphone-17-pro"
          size="sm"
          className="mt-2.5 h-8 shadow-none [&_svg]:size-3.5"
        >
          <ShoppingCart aria-hidden />
          Add to cart
        </ButtonLink>
      </div>
    </div>
  );
}
