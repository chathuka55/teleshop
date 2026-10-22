import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils/cn";

/** Glass surface — only for navbar, hero cards, trust strip, sheets and mobile bottom bars. */
export function GlassPanel<T extends ElementType = "div">({
  as,
  className,
  ...props
}: { as?: T } & ComponentProps<T>) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={cn("glass rounded-[18px]", className)} {...props} />;
}
