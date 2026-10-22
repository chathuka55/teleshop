import { ArrowRight, ShieldCheck, ShoppingCart, Store, Truck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/product/Rating";
import { HeroModelSlider } from "@/components/three/HeroModelSlider";
import { TrustStrip } from "./TrustStrip";

const stats = [
  { value: "120+", label: "Verified shops" },
  { value: "15K+", label: "Products listed" },
  { value: "25", label: "Districts with COD" },
] as const;

/** Figma "Hero" (7:308): copy on the left, 3D slider + glass float cards on the right. */
export function Hero() {
  return (
    <section className="relative isolate -mt-[74px] overflow-hidden pt-[74px] md:-mt-[82px] md:pt-[82px]">
      <HeroBackdrop />

      <div className="container-page grid items-center gap-10 pt-8 pb-10 lg:grid-cols-[minmax(0,640px)_minmax(0,600px)] lg:justify-between lg:gap-10 lg:pt-12 lg:pb-14">
        <div className="flex flex-col items-start gap-6 md:gap-7">
          <Link
            href="/c/mobile-phones"
            className="glass flex items-center gap-2.5 rounded-full border-white/8 py-1.5 pr-3.5 pl-1.5 text-[13px] font-medium shadow-none backdrop-blur-[10px] hover:bg-white/10"
          >
            <Badge tone="primary" size="sm">
              NEW
            </Badge>
            <span className="truncate">Galaxy S26 Ultra &amp; iPhone 17 Pro now in stock</span>
            <ArrowRight aria-hidden className="size-3.5 shrink-0" />
          </Link>

          <h1 className="font-display text-[40px] leading-[1.04] font-bold tracking-[-0.03em] sm:text-[56px] lg:text-[70px]">
            The future of tech,
            <br />
            <span className="text-gradient-brand">all in one place.</span>
          </h1>

          <p className="max-w-[580px] text-base leading-relaxed text-text-secondary md:text-lg">
            Shop smartphones, laptops, PC parts and accessories from verified mobile and computer shops across
            Sri Lanka. Compare real specs, pay cash on delivery and track every order live.
          </p>

          <div className="flex flex-wrap gap-3.5">
            <ButtonLink href="/shop" size="md">
              Shop Now
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="/register/seller" variant="glass" size="md">
              <Store aria-hidden />
              Become a Seller
            </ButtonLink>
          </div>

          <dl className="flex items-center pt-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={
                  i > 0
                    ? "ml-6 flex flex-col gap-0.5 border-l border-white/8 pl-6 md:ml-8 md:pl-8"
                    : "flex flex-col gap-0.5"
                }
              >
                <dt className="order-2 text-[13px] text-text-secondary">{s.label}</dt>
                <dd className="order-1 font-display text-2xl font-bold md:text-[30px]">{s.value}</dd>
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
      <div className="absolute -top-[120px] -left-[160px] size-[620px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="absolute -top-[60px] right-[-20px] size-[560px] rounded-full bg-primary-light/15 blur-[140px]" />
      <div className="absolute top-[420px] left-[40%] size-[420px] rounded-full bg-accent/10 blur-[140px]" />
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

/** Right side of the hero: rings, 3D slider (with the Figma phone as poster) and float cards. */
function HeroShowcase() {
  return (
    <div className="relative mx-auto h-[380px] w-full max-w-[600px] md:h-[560px]">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 aspect-square w-[87%] -translate-1/2 rounded-full border border-white/6" />
        <div className="absolute top-1/2 left-1/2 aspect-square w-[63%] -translate-1/2 rounded-full border border-white/8" />
        <div className="absolute top-1/2 left-1/2 aspect-square w-1/2 -translate-1/2 rounded-full bg-primary/45 blur-[70px]" />
      </div>

      <HeroModelSlider poster={<PhoneMockup />} className="absolute inset-0 pb-[88px]" />

      {/* Glass float cards (HTML on top of the canvas) */}
      <div className="glass absolute top-[70px] -left-2.5 hidden w-[230px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] md:block">
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

      <div className="glass absolute top-[96px] right-[-10px] hidden w-[190px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block">
        <Stars value={5} />
        <p className="mt-2.5 text-sm font-semibold">4.9 / 5 rating</p>
        <p className="mt-2.5 text-xs text-text-secondary">from 12,400+ reviews</p>
      </div>

      <div className="glass absolute top-[300px] right-[-20px] hidden w-[210px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] lg:block">
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

      <div className="glass absolute top-[300px] left-0 hidden w-[250px] rounded-[18px] border-white/8 p-4 backdrop-blur-[12px] md:block">
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

/** Figma "Phone Mockup" (7:421) in HTML — the server-rendered poster / LCP element. */
function PhoneMockup() {
  return (
    <div className="grid h-full place-items-center pb-6">
      <div className="relative h-[340px] w-[170px] overflow-hidden rounded-[34px] border-[1.5px] border-white/10 bg-linear-to-b from-[#334155] to-[#0b1220] shadow-[0_40px_80px_rgb(29_78_216/0.45)] md:h-[440px] md:w-[220px] md:rounded-[42px]">
        <div
          className="absolute inset-[7px] rounded-[28px] md:rounded-[34px]"
          style={{ backgroundImage: "linear-gradient(115deg, #1e3a8a 0%, #1d4ed8 36%, #3b82f6 71%)" }}
        />
        <div className="absolute top-[20px] left-1/2 h-5 w-[60px] -translate-x-1/2 rounded-[10px] bg-[#05070d]" />
        <p className="absolute top-[22px] left-7 text-[13px] font-semibold">9:41</p>
        <div className="absolute bottom-[70px] left-7 md:bottom-[80px]">
          <p className="font-display text-[32px] font-bold md:text-[40px]">17 Pro</p>
          <p className="text-[13px] leading-normal text-white/85">
            Forged in titanium.
            <br />
            Built for pros.
          </p>
          <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-xs font-bold text-[#0b1220]">
            Buy now <ArrowRight aria-hidden className="size-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
