"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBrandAction, saveCourierAction, saveSettingsAction } from "@/modules/admin/config-actions";
import { idleState, type FormState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { CheckboxField, FormMessage, TextField } from "@/components/forms/fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};
const valuesOf = (s: FormState): Record<string, string> => (s.status === "error" && s.values) || {};

function useRefreshOnSave(state: FormState): void {
  const router = useRouter();
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);
}

const rupees = (cents: number): string => (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100));

/** Site settings (A13): delivery fees, Cash on Delivery switch, platform fee. */
export function SettingsForm({
  deliveryFeeCents,
  expressFeeCents,
  codEnabled,
  platformFeeBp,
}: {
  deliveryFeeCents: number;
  expressFeeCents: number;
  codEnabled: boolean;
  platformFeeBp: number;
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, idleState);
  useRefreshOnSave(state);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Standard delivery (LKR)"
          name="deliveryFee"
          inputMode="decimal"
          defaultValue={v.deliveryFee ?? rupees(deliveryFeeCents)}
          error={f.deliveryFee}
        />
        <TextField
          label="Express delivery (LKR)"
          name="expressFee"
          inputMode="decimal"
          defaultValue={v.expressFee ?? rupees(expressFeeCents)}
          error={f.expressFee}
        />
        <TextField
          label="Teleshop fee (% of item value)"
          name="platformFeePct"
          inputMode="decimal"
          defaultValue={v.platformFeePct ?? String(platformFeeBp / 100)}
          error={f.platformFeePct}
        />
      </div>
      <CheckboxField name="codEnabled" defaultChecked={codEnabled}>
        Accept Cash on Delivery orders. Untick to pause all new orders (for example during a courier strike).
      </CheckboxField>
      <p className="text-xs text-text-muted">
        Fee changes apply to new orders and new payouts only. Products with free delivery stay free on
        standard delivery.
      </p>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

/** Add or edit a courier (A13). The sample code proves the format accepts real codes. */
export function CourierForm({
  courier,
}: {
  courier?: { id: string; name: string; codePattern: string; trackingUrlTemplate: string; isActive: boolean };
}) {
  const [state, action, pending] = useActionState(saveCourierAction, idleState);
  useRefreshOnSave(state);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="id" value={courier?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" name="name" defaultValue={v.name ?? courier?.name} error={f.name} />
        <TextField
          label="Tracking code format (regular expression)"
          name="codePattern"
          defaultValue={v.codePattern ?? courier?.codePattern}
          placeholder="^DX\d{9}$"
          className="[&_input]:font-mono"
          error={f.codePattern}
        />
        <TextField
          label="One real tracking code (to check the format)"
          name="sampleCode"
          defaultValue={v.sampleCode}
          placeholder="DX123456789"
          error={f.sampleCode}
        />
        <TextField
          label="Tracking link with {code}"
          name="trackingUrlTemplate"
          defaultValue={v.trackingUrlTemplate ?? courier?.trackingUrlTemplate}
          placeholder="https://www.domex.lk/track?waybill={code}"
          error={f.trackingUrlTemplate}
        />
      </div>
      <CheckboxField name="isActive" defaultChecked={courier?.isActive ?? true}>
        Available in the tracking panel
      </CheckboxField>
      <FormMessage state={state} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : courier ? "Save courier" : "Add courier"}
        </Button>
      </div>
    </form>
  );
}

/** Add or rename a brand (A7). The link name (slug) is fixed once created. */
export function BrandForm({ brand }: { brand?: { id: string; name: string; isActive: boolean } }) {
  const [state, action, pending] = useActionState(saveBrandAction, idleState);
  useRefreshOnSave(state);
  const f = fieldsOf(state);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={brand?.id ?? ""} />
      <TextField
        label={brand ? "Name" : "New brand"}
        name="name"
        defaultValue={brand?.name}
        error={f.name}
        className="min-w-48 flex-1"
      />
      <div className="pb-3">
        <CheckboxField name="isActive" defaultChecked={brand?.isActive ?? true}>
          Active
        </CheckboxField>
      </div>
      <div className="pb-0.5">
        <Button type="submit" size="sm" variant={brand ? "glass" : "primary"} disabled={pending}>
          {pending ? "Saving…" : brand ? "Save" : "Add brand"}
        </Button>
      </div>
      <div className="w-full empty:hidden">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
