import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Mail, Store } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/layout/Logo";
import { StatusStepper } from "@/components/orders/StatusStepper";

export const metadata: Metadata = { title: "UI preview", robots: { index: false } };

const tokens = [
  ["bg", "#0A0D14"],
  ["surface", "#141922"],
  ["surface-2", "#1C2230"],
  ["text", "#F9FAFB"],
  ["text-secondary", "#9CA3AF"],
  ["text-muted", "#6B7280"],
  ["primary", "#1D4ED8"],
  ["primary-light", "#3B82F6"],
  ["accent", "#F59E0B"],
  ["success", "#22C55E"],
  ["danger", "#EF4444"],
] as const;

const variants: ButtonVariant[] = ["primary", "glass", "outline", "danger", "light", "ghost"];
const tones: BadgeTone[] = ["primary", "accent", "success", "danger", "neutral"];

/** P0-T05 check: design tokens + base UI next to the Figma design system page (7:3). Dev only. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="container-page flex flex-col gap-12 py-12">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="text-sm text-text-secondary">Midnight Tech · design system preview</span>
      </header>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Colour tokens</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {tokens.map(([name, hex]) => (
            <li key={name} className="overflow-hidden rounded-2xl border border-line">
              <span className="block h-16" style={{ background: hex }} />
              <span className="block p-3 text-xs">
                <span className="block font-semibold">{name}</span>
                <span className="text-text-secondary">{hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Typography</h2>
        <p className="font-display text-[70px] leading-none font-bold tracking-[-0.03em]">Space Grotesk 70</p>
        <p className="mt-3 font-display text-[38px] font-bold">Heading 38</p>
        <p className="mt-2 font-display text-[26px] font-bold">Heading 26</p>
        <p className="mt-2 text-lg text-text-secondary">Inter 18 — body large</p>
        <p className="mt-1 text-[15px]">Inter 15 — body</p>
        <p className="mt-1 text-[13px] text-text-secondary">Inter 13 — caption</p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v} <ArrowRight aria-hidden />
            </Button>
          ))}
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
          <Button variant="glass" size="icon-sm" aria-label="Store">
            <Store aria-hidden />
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Badges</h2>
        <div className="flex flex-wrap gap-2.5">
          {tones.map((t) => (
            <Badge key={t} tone={t} dot>
              {t}
            </Badge>
          ))}
          <Badge tone="accent" size="xs">
            HOT
          </Badge>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold">Input</h2>
          <Input icon={<Mail />} placeholder="you@example.com" aria-label="Email" />
          <Input className="mt-3" invalid placeholder="Invalid state" aria-label="Invalid example" />
        </div>
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold">Glass panel</h2>
          <GlassPanel className="p-6">Navbar, hero cards, sheets and bottom bars only.</GlassPanel>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Status stepper</h2>
        <div className="rounded-[22px] border border-line bg-surface p-6">
          <StatusStepper status="shipped" />
        </div>
      </section>
    </main>
  );
}
