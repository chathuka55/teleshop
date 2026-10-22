import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

export type AuthFeature = { icon: LucideIcon; title: string; text: string };

/** Split auth layout (Figma 07–10): blue brand panel on the left (desktop), form on the right. */
export function AuthShell({
  headline,
  intro,
  features,
  children,
}: {
  headline: string;
  intro: string;
  features: readonly AuthFeature[];
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh gap-6 p-3 md:p-6 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-10">
      <aside
        className="relative isolate hidden flex-col overflow-hidden rounded-[28px] p-10 lg:flex"
        style={{ backgroundImage: "linear-gradient(160deg, #1e40af 0%, #1d4ed8 45%, #2563eb 100%)" }}
      >
        <span
          aria-hidden
          className="absolute top-40 right-0 -z-10 size-[420px] rounded-full bg-accent/25 blur-[120px]"
        />
        <span
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
            backgroundSize: "80px 100%",
          }}
        />
        <Logo className="[&_.text-gradient-primary]:bg-none [&_.text-gradient-primary]:text-accent" />
        <div className="mt-auto mb-auto pt-16">
          <h2 className="max-w-md font-display text-[44px] leading-[1.08] font-bold tracking-[-0.02em]">
            {headline}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">{intro}</p>
          <ul className="mt-8 flex max-w-md flex-col gap-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/8 px-5 py-4"
              >
                <Icon aria-hidden className="size-5 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="text-xs text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/70">120+ verified shops · 25 districts with Cash on Delivery</p>
      </aside>

      <main id="main" className="flex flex-col px-2 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] text-text-secondary hover:text-text"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to store
          </Link>
          <Logo className="lg:hidden" />
        </div>
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
