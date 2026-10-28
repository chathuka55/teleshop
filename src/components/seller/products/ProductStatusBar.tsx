"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, RotateCcw, Send } from "lucide-react";
import { productStatusAction } from "@/modules/products/actions";
import { canProductAction, type SellerProductAction } from "@/modules/products/access";
import type { ProductStatus } from "@/modules/products/types";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { productStatus } from "./product-status";

const buttons: {
  action: SellerProductAction;
  label: string;
  icon: typeof Send;
  variant: "primary" | "ghost";
}[] = [
  { action: "submit", label: "Send for review", icon: Send, variant: "primary" },
  { action: "reactivate", label: "Put back on sale", icon: RotateCcw, variant: "primary" },
  { action: "deactivate", label: "Take off sale", icon: EyeOff, variant: "ghost" },
];

/** Status + the status changes a seller may make (P6-T03). */
export function ProductStatusBar({
  id,
  status,
  hasImages,
}: {
  id: string;
  status: ProductStatus;
  hasImages: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const s = productStatus[status];

  const run = (action: SellerProductAction) =>
    start(async () => {
      const r = await productStatusAction({ id, action });
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={s.tone}>{s.label}</Badge>
        <p className="min-w-0 flex-1 text-sm text-text-secondary">{s.help}</p>
        {buttons
          .filter((b) => canProductAction(b.action, status))
          .map(({ action, label, icon: Icon, variant }) => (
            <Button
              key={action}
              variant={variant}
              size="sm"
              disabled={pending || (action === "submit" && !hasImages)}
              onClick={() => run(action)}
            >
              <Icon aria-hidden /> {label}
            </Button>
          ))}
      </div>
      {status === "draft" && !hasImages && (
        <p className="text-[13px] text-accent">Add at least one photo before sending it for review.</p>
      )}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn("text-[13px]", message.ok ? "text-success" : "text-danger")}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
