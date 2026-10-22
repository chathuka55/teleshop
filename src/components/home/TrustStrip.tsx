import { Banknote, RefreshCw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";

const items: readonly { icon: LucideIcon; title: string; text: string; tone: string }[] = [
  {
    icon: ShieldCheck,
    title: "Verified Sellers",
    text: "Every shop is approved",
    tone: "text-success bg-[rgb(22_163_74/0.16)]",
  },
  {
    icon: Banknote,
    title: "Cash on Delivery",
    text: "Pay at your doorstep",
    tone: "text-primary-light bg-primary/16",
  },
  {
    icon: RefreshCw,
    title: "Warranty-backed",
    text: "Shop & brand warranty",
    tone: "text-accent bg-accent/16",
  },
  {
    icon: Truck,
    title: "Island-wide Delivery",
    text: "Tracked with a code",
    tone: "text-primary-light bg-primary/16",
  },
];

/** Figma "Trust Strip" (7:478). Glass is allowed here per docs/05 §2. */
export function TrustStrip() {
  return (
    <ul className="glass grid grid-cols-2 gap-y-5 rounded-[20px] border-white/8 px-4 py-5 shadow-none lg:grid-cols-4 lg:divide-x lg:divide-white/8 lg:py-6">
      {items.map(({ icon: Icon, title, text, tone }) => (
        <li key={title} className="flex items-center gap-3.5 lg:justify-center">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
            <Icon aria-hidden className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold md:text-[15px]">{title}</span>
            <span className="text-xs text-text-secondary md:text-[13px]">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
