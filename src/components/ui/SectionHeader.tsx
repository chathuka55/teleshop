import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-9", className)}>
      <div>
        {eyebrow && (
          <p className="mb-2.5 text-xs font-semibold tracking-[0.12em] text-primary-light uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[38px]">
          {title}
        </h2>
        {description && <p className="mt-2.5 text-[15px] text-text-secondary">{description}</p>}
      </div>
      {children}
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-light hover:text-text"
        >
          {action.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}
