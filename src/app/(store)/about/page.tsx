import type { Metadata } from "next";
import { Banknote, ShieldCheck, Store, Truck, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { InfoPage } from "@/components/ui/InfoPage";

export const metadata: Metadata = {
  title: "About Teleshop",
  description: "Why we built Sri Lanka’s marketplace for verified mobile, computer and tech shops.",
};

const values: readonly { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Verified sellers only",
    text: "Every shop is checked — business registration, address and phone — before it can list.",
  },
  {
    icon: Banknote,
    title: "Pay when it arrives",
    text: "Cash on Delivery on every order. Check your item, then pay the courier.",
  },
  {
    icon: Truck,
    title: "Tracked to your door",
    text: "Each package gets a courier tracking code with a one-tap link to the courier site.",
  },
  {
    icon: Store,
    title: "Built for local shops",
    text: "Simple tools for stock, orders and IMEI records, so shops can sell island-wide.",
  },
];

const stats = [
  ["120+", "Verified shops"],
  ["15K+", "Products listed"],
  ["25", "Districts with COD"],
  ["4.9★", "Average rating"],
] as const;

/** Figma "15 · About Us" (20:1496). */
export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="ABOUT US"
      title="Tech shopping Sri Lanka can trust"
      intro="Teleshop brings the country’s mobile, computer and accessory shops into one marketplace — with real specs, verified sellers and cash on delivery."
    >
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-[20px] border border-line bg-surface p-6 text-center">
            <dd className="font-display text-3xl font-bold">{value}</dd>
            <dt className="mt-1 text-sm text-text-secondary">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-12 grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">Why we started</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            Buying a phone or laptop in Sri Lanka usually means scrolling social media pages, comparing
            incomplete specs and hoping the shop is real. Orders come in by phone, stock is tracked by hand
            and nobody knows where the parcel is. We built Teleshop to fix that — for buyers and for the shops
            that serve them.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[20px] border border-line bg-surface p-5">
              <Icon aria-hidden className="size-6 text-primary-light" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="careers"
        className="mt-12 flex flex-col items-start gap-4 rounded-[26px] border border-primary/25 bg-linear-to-r from-[#13203f] to-surface p-6 md:flex-row md:items-center md:justify-between md:p-10"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Run a tech shop?</h2>
          <p className="mt-1.5 text-[15px] text-text-secondary">
            Reach customers in all 25 districts. Approval usually takes 1–2 days.
          </p>
        </div>
        <ButtonLink href="/register/seller">Become a seller</ButtonLink>
      </section>
    </InfoPage>
  );
}
