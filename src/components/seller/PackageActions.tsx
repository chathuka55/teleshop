"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PackageCheck, PackageOpen, Truck, XCircle } from "lucide-react";
import { packageStepAction } from "@/modules/fulfilment/actions";
import { canSellerStep } from "@/modules/fulfilment/access";
import { sellerCancelReasons } from "@/modules/fulfilment/schema";
import type { PackageStatus } from "@/modules/orders/types";
import { idleState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";
import { sellerPackageStatus } from "./seller-status";

/** The next step for the shop's package (Figma S2): accept → pack → ready to ship, or cancel. */
export function PackageActions({
  orderNo,
  status,
  missingSerials,
}: {
  orderNo: string;
  status: PackageStatus;
  missingSerials: number;
}) {
  const [state, action, pending] = useActionState(packageStepAction, idleState);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();
  const fields = state.status === "error" ? state.fields : undefined;

  useEffect(() => {
    if (state.status === "ok") {
      setCancelling(false);
      router.refresh();
    }
  }, [state, router]);

  const step = (name: "accept" | "pack" | "ready", label: string, Icon: typeof Check, disabled = false) => (
    <form action={action}>
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="step" value={name} />
      <Button type="submit" disabled={pending || disabled}>
        <Icon aria-hidden /> {pending ? "Saving…" : label}
      </Button>
    </form>
  );

  return (
    <section
      aria-label="Next step"
      className="flex flex-col gap-4 rounded-[20px] border border-primary/30 bg-primary/6 p-5"
    >
      <p className="text-sm text-text-secondary">{sellerPackageStatus[status].next}</p>
      <div className="flex flex-wrap items-center gap-3">
        {canSellerStep("accept", status) && step("accept", "Accept order", Check)}
        {canSellerStep("pack", status) && step("pack", "Start packing", PackageOpen)}
        {canSellerStep("ready", status) &&
          step("ready", "Mark ready to ship", PackageCheck, missingSerials > 0)}
        {status === "ready_to_ship" && (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Truck aria-hidden className="size-4 text-primary-light" /> Waiting for courier hand-over
          </p>
        )}
        {canSellerStep("cancel", status) && !cancelling && (
          <Button variant="ghost" onClick={() => setCancelling(true)} disabled={pending}>
            <XCircle aria-hidden /> Can&apos;t fulfil
          </Button>
        )}
      </div>
      {canSellerStep("ready", status) && missingSerials > 0 && (
        <p className="text-[13px] text-accent">
          Record {missingSerials} more IMEI/serial number{missingSerials === 1 ? "" : "s"} below to continue.
        </p>
      )}

      {cancelling && (
        <form
          action={action}
          className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4"
        >
          <input type="hidden" name="orderNo" value={orderNo} />
          <input type="hidden" name="step" value="cancel" />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Why can&apos;t you fulfil this package?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(sellerCancelReasons).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/4 px-3.5 py-2.5 text-sm has-checked:border-danger/50"
                >
                  <input type="radio" name="reason" value={value} required className="accent-danger" />
                  {label}
                </label>
              ))}
            </div>
            <FieldError>{fields?.reason}</FieldError>
          </fieldset>
          <p className="text-[13px] text-text-secondary">
            The customer is emailed and the stock goes back on sale. Other shops in the same order are not
            affected.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Cancelling…" : "Cancel package"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCancelling(false)} disabled={pending}>
              Keep it
            </Button>
          </div>
        </form>
      )}
      <FormMessage state={state} />
    </section>
  );
}
