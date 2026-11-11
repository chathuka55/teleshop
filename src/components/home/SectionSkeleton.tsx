import { cn } from "@/lib/utils/cn";

/**
 * Placeholder for a home section that is still streaming from the database. It reserves roughly
 * the section's height so the page below doesn't jump much when it arrives.
 */
export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("container-page pt-14 md:pt-[88px]", className)}>
      <div className="h-full animate-pulse rounded-[24px] bg-white/[0.03]" />
    </div>
  );
}
