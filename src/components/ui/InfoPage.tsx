import type { ReactNode } from "react";
import { Badge } from "./Badge";

/** Shared shell for About / Help / Legal pages (Figma 15–18). */
export function InfoPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page pt-10 pb-20 md:pt-14">
      <header className="mx-auto max-w-3xl text-center">
        <Badge tone="primary" size="sm">
          {eyebrow}
        </Badge>
        <h1 className="mt-4 font-display text-[34px] font-bold tracking-[-0.02em] md:text-[48px]">{title}</h1>
        {intro && <p className="mt-3 text-base leading-relaxed text-text-secondary md:text-lg">{intro}</p>}
        {updated && <p className="mt-2 text-xs text-text-muted">Last updated {updated}</p>}
      </header>
      <div className="mx-auto mt-10 max-w-5xl">{children}</div>
    </div>
  );
}

/** Long-form text block with readable line length (≤ 72ch, docs/05 §3). */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[72ch] text-[15px] leading-relaxed text-text-secondary [&_a]:text-primary-light [&_a:hover]:text-text [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:text-text [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      {children}
    </div>
  );
}
