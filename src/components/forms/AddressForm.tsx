"use client";

import { useActionState, useEffect, useRef } from "react";
import { Home, MapPin, Smartphone, User } from "lucide-react";
import { districts } from "@/config/districts";
import { saveAddressAction } from "@/modules/addresses/actions";
import type { AddressDTO } from "@/modules/addresses/types";
import { idleState, type FormState } from "@/lib/validation/form";
import { Button } from "@/components/ui/Button";
import { CheckboxField, FormMessage, SelectField, TextField } from "./fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};
const valuesOf = (s: FormState): Record<string, string> => (s.status === "error" && s.values) || {};

const labels = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
] as const;

/** Local format for the phone box ("+94771234567" → "0771234567"). */
const localPhone = (e164?: string): string => (e164?.startsWith("+94") ? `0${e164.slice(3)}` : (e164 ?? ""));

/** Add / edit a delivery address (Figma 22 · Saved Addresses; checkout step 1). */
export function AddressForm({
  address,
  submitLabel = "Save address",
  onSaved,
}: {
  address?: AddressDTO;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(saveAddressAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);

  // Once per successful save — `onSaved` may be a new function on every parent render.
  const handled = useRef<FormState | null>(null);
  useEffect(() => {
    if (state.status !== "ok" || handled.current === state) return;
    handled.current = state;
    onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Recipient name"
          name="recipientName"
          defaultValue={v.recipientName ?? address?.recipientName}
          autoComplete="name"
          icon={<User />}
          error={f.recipientName}
          required
        />
        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          defaultValue={v.phone ?? localPhone(address?.phone)}
          autoComplete="tel"
          placeholder="07X XXX XXXX"
          icon={<Smartphone />}
          error={f.phone}
          required
        />
      </div>
      <TextField
        label="House number and street"
        name="line1"
        defaultValue={v.line1 ?? address?.line1}
        autoComplete="address-line1"
        icon={<Home />}
        error={f.line1}
        required
      />
      <TextField
        label="Apartment, landmark (optional)"
        name="line2"
        defaultValue={v.line2 ?? address?.line2}
        autoComplete="address-line2"
        error={f.line2}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="City"
          name="city"
          defaultValue={v.city ?? address?.city}
          autoComplete="address-level2"
          icon={<MapPin />}
          error={f.city}
          required
        />
        <SelectField
          label="District"
          name="district"
          placeholder="Choose…"
          options={districts.map((d) => ({ value: d, label: d }))}
          defaultValue={v.district ?? address?.district ?? ""}
          error={f.district}
          required
        />
        <TextField
          label="Postal code"
          name="postalCode"
          inputMode="numeric"
          defaultValue={v.postalCode ?? address?.postalCode ?? ""}
          autoComplete="postal-code"
          error={f.postalCode}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SelectField
          label="Label"
          name="label"
          options={labels}
          defaultValue={v.label ?? address?.label ?? "home"}
          className="w-36"
        />
        <CheckboxField name="makeDefault" defaultChecked={address?.isDefault}>
          Use as my default address
        </CheckboxField>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
