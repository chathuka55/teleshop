import type { TimelineEntryDTO } from "@/modules/orders/types";
import { cn } from "@/lib/utils/cn";
import { orderStatusLabel, packageStatusLabel } from "./order-status";

const labelOf = (s: TimelineEntryDTO["status"]): string =>
  s in packageStatusLabel
    ? packageStatusLabel[s as keyof typeof packageStatusLabel]
    : orderStatusLabel[s as keyof typeof orderStatusLabel].label;

const when = (iso: string): string =>
  new Date(iso).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** A package's history from order_events, newest first (P5-T01, Figma 13 / M5). */
export function PackageTimeline({ entries }: { entries: readonly TimelineEntryDTO[] }) {
  if (!entries.length) return null;
  const newestFirst = [...entries].reverse();
  return (
    <ol className="flex flex-col" aria-label="Package history">
      {newestFirst.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
          {i < newestFirst.length - 1 && (
            <span aria-hidden className="absolute top-3 left-[5px] h-full w-px bg-line" />
          )}
          <span
            aria-hidden
            className={cn(
              "relative mt-1.5 size-[11px] shrink-0 rounded-full",
              i === 0 ? (e.status === "cancelled" ? "bg-danger" : "bg-success") : "bg-white/20",
            )}
          />
          <div className="min-w-0 text-sm">
            <p className={cn("font-semibold", i > 0 && "text-text-secondary")}>{labelOf(e.status)}</p>
            {e.note && e.note.toLowerCase() !== labelOf(e.status).toLowerCase() && (
              <p className="text-[13px] text-text-secondary">{e.note}</p>
            )}
            <p className="text-xs text-text-muted">
              <time dateTime={e.at}>{when(e.at)}</time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
