import { Check } from "lucide-react";
import type { PackageStatus } from "@/modules/orders/types";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  {
    label: "Placed",
    reached: ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "delivered"],
  },
  { label: "Confirmed", reached: ["confirmed", "processing", "ready_to_ship", "shipped", "delivered"] },
  { label: "Processing", reached: ["processing", "ready_to_ship", "shipped", "delivered"] },
  { label: "Shipped", reached: ["shipped", "delivered"] },
  { label: "Delivered", reached: ["delivered"] },
] as const satisfies ReadonlyArray<{ label: string; reached: readonly PackageStatus[] }>;

/** Package progress (Figma 14 / 13). Cancelled and returned are shown as a badge elsewhere. */
export function StatusStepper({ status }: { status: PackageStatus }) {
  const done = STEPS.map((s) => (s.reached as readonly PackageStatus[]).includes(status));
  return (
    <ol className="grid grid-cols-5 items-start" aria-label="Delivery progress">
      {STEPS.map((step, i) => (
        <li key={step.label} className="relative flex flex-col items-center gap-2 text-center">
          {i > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-3.5 right-1/2 h-0.5 w-full -translate-x-3.5",
                done[i] ? "bg-linear-to-r from-success to-primary-light" : "bg-white/10",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 grid size-7 place-items-center rounded-full text-xs font-semibold",
              done[i] ? "bg-success text-white" : "border border-line bg-surface-2 text-text-secondary",
            )}
          >
            {done[i] ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
          </span>
          <span
            className={cn(
              "text-[11px] font-semibold md:text-xs",
              done[i] ? "text-text" : "text-text-secondary",
            )}
          >
            {step.label}
            <span className="sr-only">{done[i] ? " — done" : " — not yet"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
