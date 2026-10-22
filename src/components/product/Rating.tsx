import { Star } from "lucide-react";
import type { RatingDTO } from "@/modules/catalog/types";
import { cn } from "@/lib/utils/cn";

export function Rating({
  rating,
  compact = false,
  className,
}: {
  rating: RatingDTO;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Star aria-hidden className="size-3.5 fill-accent text-accent" />
      <span className="text-[13px] font-semibold">{rating.average.toFixed(1)}</span>
      {!compact && (
        <span className="text-xs text-text-muted">({rating.count.toLocaleString("en-LK")} reviews)</span>
      )}
      <span className="sr-only">out of 5</span>
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" className={cn("inline-flex gap-1", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-3.5", i <= Math.round(value) ? "fill-accent text-accent" : "text-text-muted")}
        />
      ))}
    </span>
  );
}
