"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelOrderAction } from "@/modules/orders/actions";
import { cancelReasons } from "@/modules/orders/status";
import { idleState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

/** "Cancel order" with a reason (P5-T04). Shown only while no package has shipped. */
export function CancelOrderForm({ orderNo }: { orderNo: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelOrderAction, idleState);
  const router = useRouter();
  const fields = state.status === "error" ? state.fields : undefined;

  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  if (!open) {
    return (
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <XCircle aria-hidden /> Cancel order
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-[20px] border border-danger/30 bg-danger/5 p-5"
      aria-label="Cancel this order"
    >
      <input type="hidden" name="orderNo" value={orderNo} />
      <div>
        <p className="font-display text-lg font-bold">Cancel this order?</p>
        <p className="text-sm text-text-secondary">
          Every package is cancelled and the shops stop preparing them. Nothing is charged — you only pay on
          delivery.
        </p>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-text-secondary">Why are you cancelling?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(cancelReasons).map(([value, label]) => (
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
      <div>
        <label
          htmlFor={`cancel-note-${orderNo}`}
          className="mb-2 block text-[13px] font-medium text-text-secondary"
        >
          Anything else? (optional)
        </label>
        <input
          id={`cancel-note-${orderNo}`}
          name="note"
          maxLength={200}
          className="h-11 w-full rounded-[14px] border border-line bg-white/4 px-4 text-sm outline-none focus:border-primary-light/60"
        />
        <FieldError>{fields?.note}</FieldError>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Cancelling…" : "Yes, cancel order"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Keep my order
        </Button>
      </div>
    </form>
  );
}
