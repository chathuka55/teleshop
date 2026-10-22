import { formatLKR } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export function PriceTag({
  priceCents,
  compareAtCents,
  freeDelivery = false,
  size = "md",
  className,
}: {
  priceCents: number;
  compareAtCents?: number | null;
  freeDelivery?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasCompare = !!compareAtCents && compareAtCents > priceCents;
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "font-display font-bold whitespace-nowrap",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-[32px] leading-tight",
        )}
      >
        {formatLKR(priceCents)}
      </span>
      {hasCompare ? (
        <span className="text-xs text-text-muted line-through">
          <span className="sr-only">Was </span>
          {formatLKR(compareAtCents)}
        </span>
      ) : freeDelivery ? (
        <span className="text-xs text-success">Free delivery</span>
      ) : null}
    </div>
  );
}
