"use client";

import { useActionState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { ScanBarcode } from "lucide-react";
import { recordSerialAction } from "@/modules/fulfilment/actions";
import { idleState, type FormState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

const typed = (s: FormState): string[] => (s.status === "error" && s.values?.serials?.split("\n")) || [];

/** One IMEI/serial box per unit of an order line (P6-T04). */
export function SerialForm({
  orderNo,
  itemId,
  qty,
  saved,
  required,
}: {
  orderNo: string;
  itemId: string;
  qty: number;
  saved: readonly string[];
  required: boolean;
}) {
  const [state, action, pending] = useActionState(recordSerialAction, idleState);
  const router = useRouter();
  const id = useId();
  const values = typed(state);
  const error = state.status === "error" ? state.fields?.serials : undefined;

  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-2.5" noValidate>
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="itemId" value={itemId} />
      <p className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
        <ScanBarcode aria-hidden className="size-4" />
        IMEI / serial number{qty > 1 ? "s" : ""} {required ? "(required)" : "(optional)"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: qty }, (_, i) => (
          <div key={i}>
            <label htmlFor={`${id}-${i}`} className="sr-only">
              Unit {i + 1} IMEI or serial
            </label>
            <input
              id={`${id}-${i}`}
              name="serial"
              defaultValue={values[i] ?? saved[i] ?? ""}
              placeholder={qty > 1 ? `Unit ${i + 1} — 15-digit IMEI or serial` : "15-digit IMEI or serial"}
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              aria-invalid={!!error || undefined}
              className="h-11 w-full rounded-[14px] border border-line bg-white/4 px-4 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:text-text-muted placeholder:normal-case focus:border-primary-light/60"
            />
          </div>
        ))}
      </div>
      <FieldError>{error}</FieldError>
      {state.status !== "error" || !error ? <FormMessage state={state} /> : null}
      <div>
        <Button type="submit" variant="glass" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save numbers"}
        </Button>
      </div>
    </form>
  );
}
