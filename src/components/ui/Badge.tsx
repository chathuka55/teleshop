import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "primary" | "accent" | "success" | "danger" | "neutral" | "onColor";

const toneClass: Record<BadgeTone, string> = {
  primary: "bg-primary/18 text-primary-soft",
  accent: "bg-accent/14 text-accent",
  success: "bg-[rgb(22_163_74/0.14)] text-success",
  danger: "bg-danger/14 text-danger",
  neutral: "bg-[rgb(107_114_128/0.12)] text-text-secondary",
  onColor: "bg-white/18 text-on-primary",
};

export function Badge({
  tone = "neutral",
  dot = false,
  size = "md",
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "xs" && "px-1.5 py-0.5 text-[9px]",
        size === "sm" && "px-2 py-[3px] text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-[3px] bg-current" />}
      {children}
    </span>
  );
}
