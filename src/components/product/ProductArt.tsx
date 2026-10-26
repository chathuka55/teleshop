import Image from "next/image";
import { Cpu, Gamepad2, Headphones, Monitor, Router } from "lucide-react";
import type { ProductCardDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";

const screen: Record<ProductCardDTO["art"]["tint"], string> = {
  blue: "linear-gradient(115deg, #1e40af 0%, #3b82f6 36%, #3b82f6 71%)",
  orange: "linear-gradient(115deg, #c2410c 0%, #f97316 45%, #fb923c 80%)",
  silver: "linear-gradient(115deg, #334155 0%, #64748b 45%, #94a3b8 80%)",
  amber: "linear-gradient(115deg, #b45309 0%, #f59e0b 60%)",
};

const glow: Record<ProductCardDTO["art"]["tint"], string> = {
  blue: "rgb(59 130 246 / 0.45)",
  orange: "rgb(59 130 246 / 0.4)",
  silver: "rgb(59 130 246 / 0.35)",
  amber: "rgb(245 158 11 / 0.4)",
};

/**
 * Product image slot. Uses the real image when one exists; otherwise draws the device
 * illustrations from the Figma product cards (phone / laptop / watch shapes, icon art).
 */
export function ProductArt({
  product,
  className,
  size = "md",
  priority = false,
  artScale,
}: {
  product: Pick<ProductCardDTO, "art" | "imageUrl" | "name">;
  className?: string;
  size?: "md" | "lg";
  priority?: boolean;
  /** Scale of the drawn device (1 = card size). Defaults to 1.9 for `lg`. */
  artScale?: number;
}) {
  const { kind, tint } = product.art;
  const scale = artScale ?? (size === "lg" ? 1.9 : 1);

  return (
    <div
      className={cn(
        "relative isolate grid place-items-center overflow-hidden rounded-[14px] bg-linear-to-b from-surface-2 to-[#0e121a]",
        className,
      )}
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority={priority}
          sizes={size === "lg" ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 1024px) 300px, 50vw"}
          className="object-contain p-6 drop-shadow-[0_16px_28px_rgb(0_0_0/0.45)]"
        />
      ) : (
        <>
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 -z-10 aspect-square w-[55%] -translate-1/2 rounded-full blur-2xl"
            style={{ background: glow[tint] }}
          />
          <span
            role="img"
            aria-label={product.name}
            className="absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center"
            style={{ scale: String(scale) }}
          >
            {kind === "phone" && <PhoneArt fill={screen[tint]} />}
            {kind === "laptop" && <LaptopArt fill={screen[tint]} />}
            {kind === "watch" && <WatchArt />}
            {kind === "headphones" && <Headphones aria-hidden strokeWidth={1.5} className={iconArt(tint)} />}
            {kind === "cpu" && <Cpu aria-hidden strokeWidth={1.5} className={iconArt(tint)} />}
            {kind === "gpu" && <GpuArt />}
            {kind === "monitor" && <Monitor aria-hidden strokeWidth={1.5} className={iconArt(tint)} />}
            {kind === "router" && <Router aria-hidden strokeWidth={1.5} className={iconArt(tint)} />}
            {kind === "gamepad" && <Gamepad2 aria-hidden strokeWidth={1.5} className={iconArt(tint)} />}
          </span>
        </>
      )}
    </div>
  );
}

const iconArt = (tint: ProductCardDTO["art"]["tint"]): string =>
  cn("size-[105px]", tint === "amber" ? "text-accent" : "text-primary-light");

function PhoneArt({ fill }: { fill: string }) {
  return (
    <span className="relative block h-[143px] w-[73px] rounded-[15px] border border-white/10 bg-linear-to-b from-[#2a3550] to-[#111827]">
      <span className="absolute inset-[3px] rounded-[11px]" style={{ background: fill }} />
      <span className="absolute top-[9px] left-1/2 h-[6px] w-[21px] -translate-x-1/2 rounded-[3px] bg-[#05070d]" />
    </span>
  );
}

function LaptopArt({ fill }: { fill: string }) {
  return (
    <span className="relative block h-[110px] w-[187px]">
      <span className="absolute top-0 left-[13px] h-[101px] w-[160px] rounded-[8px] border border-white/10 bg-linear-to-b from-[#2a3550] to-[#111827]">
        <span className="absolute inset-[4px] rounded-[5px]" style={{ background: fill }} />
      </span>
      <span className="absolute bottom-0 left-0 h-[9px] w-[187px] rounded-b-[6px] bg-linear-to-b from-[#94a3b8] to-[#475569]" />
    </span>
  );
}

function WatchArt() {
  return (
    <span className="relative block h-[162px] w-[83px]">
      <span className="absolute left-1/2 h-full w-[44px] -translate-x-1/2 rounded-[10px] bg-linear-to-b from-[#1f2937] via-[#111827] to-[#1f2937]" />
      <span className="absolute top-[37px] left-0 h-[88px] w-[76px] rounded-[22px] border border-white/15 bg-[#0b0f17] p-[6px]">
        <span className="block size-full rounded-[16px] bg-linear-135 from-[#f59e0b] via-[#3b82f6] to-[#1d4ed8]" />
      </span>
      <span className="absolute top-[70px] right-0 h-[17px] w-[5px] rounded-full bg-[#374151]" />
    </span>
  );
}

function GpuArt() {
  return (
    <span className="relative flex h-[70px] w-[190px] items-center justify-around rounded-[10px] border border-white/10 bg-linear-to-b from-[#1f2937] to-[#0b0f17] px-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="grid size-[48px] place-items-center rounded-full border-2 border-primary-light/60 bg-[#05070d]"
        >
          <span className="size-3 rounded-full bg-primary-light/70" />
        </span>
      ))}
      <span className="absolute inset-x-3 -top-px h-[2px] rounded-full bg-primary-light" />
    </span>
  );
}
