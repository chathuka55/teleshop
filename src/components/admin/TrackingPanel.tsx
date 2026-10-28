"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Truck } from "lucide-react";
import { buildTrackingUrl } from "@/config/couriers";
import { addTrackingCodeAction } from "@/modules/admin/actions";
import { normaliseTrackingCode, trackingCodeMatches } from "@/modules/orders/admin-access";
import type { CourierDTO } from "@/modules/orders/admin-types";
import type { PackageStatus } from "@/modules/orders/types";
import { idleState, type FormState } from "@/lib/validation/form";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage } from "@/components/forms/fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};

/** Now, as a Sri Lanka `datetime-local` value ("2026-10-28T14:05"). */
function colomboNow(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 16);
}

const input =
  "h-11 w-full rounded-[14px] border bg-white/4 px-3.5 text-sm outline-none focus:border-primary-light/60";

/**
 * Courier & Tracking panel (phase-7 notes, Figma A4): courier → tracking code checked against the
 * courier's format → preview of the link → "Save & mark as Shipped" → email the customer.
 */
export function TrackingPanel({
  orderNo,
  packageId,
  status,
  couriers,
}: {
  orderNo: string;
  packageId: string;
  status: PackageStatus;
  couriers: readonly CourierDTO[];
}) {
  const [state, action, pending] = useActionState(addTrackingCodeAction, idleState);
  const [courierId, setCourierId] = useState(couriers[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [handedOverAt] = useState(colomboNow);
  const router = useRouter();
  const f = fieldsOf(state);

  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  const courier = couriers.find((c) => c.id === courierId);
  const normalised = normaliseTrackingCode(code);
  const valid = !!courier && !!normalised && trackingCodeMatches(courier.codePattern, normalised);
  const preview = useMemo(
    () => (courier && valid ? buildTrackingUrl(courier.trackingUrlTemplate, normalised) : null),
    [courier, valid, normalised],
  );

  // Kept mounted across the refresh so the result stays visible once the package has shipped.
  if (status !== "ready_to_ship" || !couriers.length) {
    return state.status === "ok" ? <FormMessage state={state} /> : null;
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/6 p-4"
    >
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="packageId" value={packageId} />
      <p className="flex items-center gap-2 font-semibold">
        <Truck aria-hidden className="size-4 text-primary-light" /> Courier &amp; tracking
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`courier-${packageId}`} className="mb-1.5 block text-[13px] text-text-secondary">
            Courier
          </label>
          <select
            id={`courier-${packageId}`}
            name="courierId"
            value={courierId}
            onChange={(e) => setCourierId(e.target.value)}
            className={cn(input, f.courierId ? "border-danger/60" : "border-line")}
          >
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError>{f.courierId}</FieldError>
        </div>
        <div>
          <label htmlFor={`code-${packageId}`} className="mb-1.5 block text-[13px] text-text-secondary">
            Tracking code
          </label>
          <input
            id={`code-${packageId}`}
            name="trackingCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            aria-invalid={(!!code && !valid) || !!f.trackingCode || undefined}
            className={cn(
              input,
              "font-mono uppercase",
              (code && !valid) || f.trackingCode ? "border-danger/60" : "border-line",
            )}
          />
          <FieldError>
            {f.trackingCode ?? (code && !valid ? `Not a ${courier?.name ?? ""} code format` : undefined)}
          </FieldError>
        </div>
        <div>
          <label htmlFor={`at-${packageId}`} className="mb-1.5 block text-[13px] text-text-secondary">
            Handed over (Sri Lanka time)
          </label>
          <input
            id={`at-${packageId}`}
            name="handedOverAt"
            type="datetime-local"
            defaultValue={handedOverAt}
            className={cn(input, f.handedOverAt ? "border-danger/60" : "border-line")}
          />
          <FieldError>{f.handedOverAt}</FieldError>
        </div>
      </div>
      {preview && (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
          Link the customer gets:
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium break-all text-primary-light hover:text-text"
          >
            {preview} <ExternalLink aria-hidden className="size-3.5 shrink-0" />
          </a>
        </p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-primary" />
        Email the customer the tracking link
      </label>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? "Saving…" : "Save & mark as Shipped"}
        </Button>
      </div>
    </form>
  );
}
