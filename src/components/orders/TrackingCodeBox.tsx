"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Hash, Truck } from "lucide-react";
import type { ShipmentDTO } from "@/modules/orders/types";

/** Courier + tracking code (copy) + "Track on courier website" (P5-T02). Reused on desktop and mobile. */
export function TrackingCodeBox({ shipment }: { shipment: ShipmentDTO }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shipment.trackingCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is still selectable.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 p-3">
      <span className="flex items-center gap-2 px-1 text-sm font-semibold">
        <Truck aria-hidden className="size-4 text-primary-light" />
        {shipment.courierName}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-primary/30 bg-black/20 py-1.5 pr-1.5 pl-3">
        <Hash aria-hidden className="size-4 shrink-0 text-accent" />
        <code className="flex-1 truncate font-sans text-sm font-semibold text-accent select-all">
          {shipment.trackingCode}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Tracking code copied" : "Copy tracking code"}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/8 hover:bg-white/12"
        >
          {copied ? (
            <Check aria-hidden className="size-4 text-success" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
        </button>
      </span>
      <a
        href={shipment.trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-gradient-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-on-primary hover:brightness-110"
      >
        Open courier site <ExternalLink aria-hidden className="size-4" />
      </a>
    </div>
  );
}
