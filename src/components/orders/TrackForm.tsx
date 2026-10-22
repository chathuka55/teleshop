"use client";

import { useActionState } from "react";
import { Hash, Search, Smartphone } from "lucide-react";
import { trackOrderAction, type TrackState } from "@/modules/orders/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { StatusStepper } from "./StatusStepper";
import { TrackingCodeBox } from "./TrackingCodeBox";

const initial: TrackState = { status: "idle" };

const statusBadge = {
  shipped: { tone: "primary", label: "In transit" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "danger", label: "Cancelled" },
  returned: { tone: "danger", label: "Returned" },
} as const;

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, initial);
  const fields = state.status === "error" ? state.fields : undefined;
  const values = state.status === "idle" ? undefined : state.values;

  return (
    <div className="flex flex-col gap-5">
      <form
        action={action}
        className="glass grid gap-2.5 rounded-[20px] p-2.5 shadow-none sm:grid-cols-[1fr_1fr_auto]"
        noValidate
      >
        <div>
          <label className="flex h-14 items-center gap-3 rounded-[14px] bg-white/4 px-4">
            <Hash aria-hidden className="size-4 text-text-muted" />
            <span className="flex flex-1 flex-col">
              <span className="text-[11px] text-text-muted">Order number</span>
              <input
                name="orderNo"
                defaultValue={values?.orderNo}
                required
                placeholder="TS-2026-000123"
                autoComplete="off"
                aria-invalid={!!fields?.orderNo || undefined}
                className="bg-transparent text-sm font-semibold uppercase outline-none placeholder:font-normal placeholder:text-text-muted placeholder:normal-case"
              />
            </span>
          </label>
          <FieldError>{fields?.orderNo}</FieldError>
        </div>
        <div>
          <label className="flex h-14 items-center gap-3 rounded-[14px] bg-white/4 px-4">
            <Smartphone aria-hidden className="size-4 text-text-muted" />
            <span className="flex flex-1 flex-col">
              <span className="text-[11px] text-text-muted">Phone number</span>
              <input
                name="phone"
                defaultValue={values?.phone}
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="077 123 4567"
                aria-invalid={!!fields?.phone || undefined}
                className="bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-text-muted"
              />
            </span>
          </label>
          <FieldError>{fields?.phone}</FieldError>
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-14">
          <Search aria-hidden /> {pending ? "Looking…" : "Track order"}
        </Button>
      </form>

      <div aria-live="polite">
        {state.status === "error" && !state.fields && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-center text-sm text-danger"
          >
            {state.message}
          </p>
        )}
        {state.status === "found" && (
          <section className="rounded-[22px] border border-line bg-surface p-5 md:p-6">
            <h2 className="font-semibold">
              {state.result.orderNo} · {state.result.packages.length} packages
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Last update:{" "}
              {new Date(state.result.lastUpdate.at).toLocaleString("en-LK", {
                timeZone: "Asia/Colombo",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              — {state.result.lastUpdate.note}
            </p>
            <ul className="mt-5 flex flex-col gap-6">
              {state.result.packages.map((pkg, i) => {
                const badge = statusBadge[pkg.status as keyof typeof statusBadge];
                return (
                  <li
                    key={pkg.id}
                    className="flex flex-col gap-4 border-t border-line pt-5 first:border-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">
                        Package {i + 1} · {pkg.sellerName}
                      </span>
                      <Badge tone={badge?.tone ?? "neutral"} dot>
                        {badge?.label ?? "Being prepared"}
                      </Badge>
                    </div>
                    <StatusStepper status={pkg.status} />
                    {pkg.shipment ? (
                      <TrackingCodeBox shipment={pkg.shipment} />
                    ) : (
                      <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-text-secondary">
                        The tracking code appears here once the shop hands this package to the courier.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
