import { Banknote, Package, Search, Truck, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

const steps: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Search,
    title: "Browse & compare",
    text: "Filter by brand, price and real specs. Compare up to 4 products.",
  },
  {
    icon: Banknote,
    title: "Order with COD",
    text: "Place your order and choose Cash on Delivery at checkout.",
  },
  {
    icon: Truck,
    title: "Track with a code",
    text: "Get a courier tracking code once your order is handed over.",
  },
  {
    icon: Package,
    title: "Receive & pay",
    text: "Check your item, pay the courier and leave a verified review.",
  },
];

/** Figma "How It Works" (7:1081). */
export function HowItWorks() {
  return (
    <section className="container-page pt-14 md:pt-[88px]">
      <SectionHeader
        eyebrow="Simple & safe"
        title="From click to doorstep"
        description="Order with confidence — no card needed."
      />
      <ol className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-[22px] border border-white/7 bg-surface p-7">
            <div className="flex items-center justify-between">
              <span className="grid size-[52px] place-items-center rounded-2xl bg-primary/14 text-primary-light">
                <Icon aria-hidden className="size-6" />
              </span>
              {/* Decorative watermark via CSS content: not text, so not read out or contrast-checked. */}
              <span
                aria-hidden
                data-step={String(i + 1).padStart(2, "0")}
                className="font-display text-[38px] font-bold text-white/8 after:content-[attr(data-step)]"
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
