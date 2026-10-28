"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, PackageX, Undo2 } from "lucide-react";
import { adminPackageStepAction } from "@/modules/admin/actions";
import { canAdminStep } from "@/modules/orders/admin-access";
import type { PackageStatus } from "@/modules/orders/types";
import { idleState } from "@/lib/validation/form";
import { formatLKR } from "@/lib/utils/money";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

type Step = "deliver" | "return" | "cancel";

const copy: Record<Step, { title: string; button: string; noteLabel?: string; required?: boolean }> = {
  deliver: { title: "Confirm delivery", button: "Yes — delivered, COD collected" },
  return: { title: "Delivery failed", button: "Mark returned", noteLabel: "What happened? (optional)" },
  cancel: {
    title: "Cancel this package",
    button: "Cancel package",
    noteLabel: "Reason (customer and shop see it)",
    required: true,
  },
};

/** Delivered + COD collected, returned by the courier, or cancelled by Teleshop (P7-T02). */
export function PackageAdminActions({
  orderNo,
  packageId,
  status,
  amountCents,
}: {
  orderNo: string;
  packageId: string;
  status: PackageStatus;
  amountCents: number;
}) {
  const [state, action, pending] = useActionState(adminPackageStepAction, idleState);
  const [open, setOpen] = useState<Step | null>(null);
  const router = useRouter();
  const fields = state.status === "error" ? state.fields : undefined;

  useEffect(() => {
    if (state.status === "ok") {
      setOpen(null);
      router.refresh();
    }
  }, [state, router]);

  const available = (["deliver", "return", "cancel"] as const).filter((s) => canAdminStep(s, status));
  // Kept mounted across the refresh: after the last step, show its result instead of buttons.
  if (!available.length) return state.status === "ok" ? <FormMessage state={state} /> : null;

  return (
    <div className="flex flex-col gap-3">
      {!open && (
        <div className="flex flex-wrap gap-2.5">
          {available.includes("deliver") && (
            <Button size="sm" onClick={() => setOpen("deliver")}>
              <Banknote aria-hidden /> Delivered &amp; COD collected
            </Button>
          )}
          {available.includes("return") && (
            <Button size="sm" variant="glass" onClick={() => setOpen("return")}>
              <Undo2 aria-hidden /> Returned
            </Button>
          )}
          {available.includes("cancel") && (
            <Button size="sm" variant="ghost" onClick={() => setOpen("cancel")}>
              <PackageX aria-hidden /> Cancel package
            </Button>
          )}
        </div>
      )}
      {open && (
        <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-white/3 p-4">
          <input type="hidden" name="orderNo" value={orderNo} />
          <input type="hidden" name="packageId" value={packageId} />
          <input type="hidden" name="step" value={open} />
          <p className="font-semibold">{copy[open].title}</p>
          {open === "deliver" && (
            <p className="text-sm text-text-secondary">
              The courier collected <strong className="text-text">{formatLKR(amountCents)}</strong>. This
              marks the package paid, counts its stock as sold and adds it to the shop&apos;s payout.
            </p>
          )}
          {copy[open].noteLabel && (
            <div>
              <label htmlFor={`note-${packageId}`} className="mb-1.5 block text-[13px] text-text-secondary">
                {copy[open].noteLabel}
              </label>
              <input
                id={`note-${packageId}`}
                name="note"
                maxLength={200}
                required={copy[open].required}
                className="h-11 w-full rounded-[14px] border border-line bg-white/4 px-3.5 text-sm outline-none focus:border-primary-light/60"
              />
              <FieldError>{fields?.note}</FieldError>
            </div>
          )}
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="submit"
              size="sm"
              variant={open === "deliver" ? "primary" : "danger"}
              disabled={pending}
            >
              {pending ? "Saving…" : copy[open].button}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(null)} disabled={pending}>
              Back
            </Button>
          </div>
        </form>
      )}
      {!open && state.status === "ok" && <FormMessage state={state} />}
    </div>
  );
}
