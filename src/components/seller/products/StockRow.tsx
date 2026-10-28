"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { stockChangeAction } from "@/modules/products/actions";
import type { StockRowDTO } from "@/modules/products/types";
import { cn } from "@/lib/utils/cn";

/** Stock steppers for one SKU (Figma S3): −1 / +1, or type the count on the shelf. */
export function StockControls({ row }: { row: StockRowDTO }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(String(row.onHand));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const send = (mode: "add" | "remove" | "set", qty: number) => {
    // Show the new count at once; the server's answer confirms it or puts the old one back.
    if (mode !== "set") setValue((v) => String(Math.max(0, Number(v) + (mode === "add" ? qty : -qty))));
    start(async () => {
      const r = await stockChangeAction({ sku: row.sku, mode, qty });
      setError(r.ok ? null : r.message);
      if (r.ok) router.refresh();
      else setValue(String(row.onHand));
    });
  };

  const step =
    "grid size-9 place-items-center rounded-lg border border-line bg-white/4 hover:bg-white/8 disabled:opacity-40";
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={step}
          disabled={pending || row.available <= 0}
          onClick={() => send("remove", 1)}
          aria-label={`One less ${row.sku}`}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          value={value}
          inputMode="numeric"
          aria-label={`Units of ${row.sku} on the shelf`}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => value !== String(row.onHand) && value !== "" && send("set", Number(value))}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className={cn(
            "h-9 w-16 rounded-lg border bg-white/4 text-center text-sm font-semibold outline-none focus:border-primary-light/60",
            error ? "border-danger/60" : "border-line",
          )}
        />
        <button
          type="button"
          className={step}
          disabled={pending}
          onClick={() => send("add", 1)}
          aria-label={`One more ${row.sku}`}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-56 text-right text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
