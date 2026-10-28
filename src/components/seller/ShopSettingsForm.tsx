"use client";

import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Hash, ImagePlus, Landmark, MapPin, Smartphone, Trash2 } from "lucide-react";
import { districts } from "@/config/districts";
import { shopCoverAction, updateShopAction } from "@/modules/sellers/actions";
import type { ShopSettingsDTO } from "@/modules/sellers/types";
import { idleState, type FormState } from "@/lib/validation/form";
import { formatPhoneLK } from "@/lib/utils/strings";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { FormMessage, SelectField, TextField } from "@/components/forms/fields";

const fieldsOf = (s: FormState): Record<string, string> => (s.status === "error" && s.fields) || {};
const valuesOf = (s: FormState): Record<string, string> => (s.status === "error" && s.values) || {};

/** Shop profile shown on the public shop page, dispatch time and payout bank (Figma S4). */
export function ShopSettingsForm({ shop }: { shop: ShopSettingsDTO }) {
  const [state, action, pending] = useActionState(updateShopAction, idleState);
  const f = fieldsOf(state);
  const v = valuesOf(state);
  const a = shop.address;
  const bank = shop.payoutAccount;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Shop profile</h2>
        <div>
          <label htmlFor="shop-about" className="mb-2 block text-[13px] font-medium text-text-secondary">
            About your shop
          </label>
          <textarea
            id="shop-about"
            name="description"
            rows={4}
            maxLength={1000}
            defaultValue={v.description ?? shop.description}
            placeholder="What you sell, brands you're authorised for, after-sales service…"
            className="w-full rounded-[14px] border border-line bg-white/4 px-4 py-3 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60"
          />
          <FieldError>{f.description}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Opening hours"
            name="openingHours"
            maxLength={80}
            defaultValue={v.openingHours ?? shop.openingHours}
            placeholder="Mon–Sat 9.00–19.00 · Sun 10.00–14.00"
            icon={<Clock />}
            error={f.openingHours}
          />
          <TextField
            label="Shop phone"
            name="phone"
            type="tel"
            defaultValue={v.phone ?? formatPhoneLK(shop.phone)}
            icon={<Smartphone />}
            error={f.phone}
            required
          />
        </div>
        <TextField
          label="Tags (comma separated, up to 5)"
          name="tags"
          defaultValue={v.tags ?? shop.tags.join(", ")}
          placeholder="Phones, Apple, Repairs"
          icon={<Hash />}
          error={f.tags}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Address and dispatch</h2>
        <TextField
          label="Street address"
          name="addressLine1"
          defaultValue={v.addressLine1 ?? a.line1}
          icon={<MapPin />}
          error={f.addressLine1}
          required
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="City" name="city" defaultValue={v.city ?? a.city} error={f.city} required />
          <SelectField
            label="District"
            name="district"
            options={districts.map((d) => ({ value: d, label: d }))}
            defaultValue={v.district ?? a.district}
            error={f.district}
          />
          <TextField
            label="Postal code"
            name="postalCode"
            inputMode="numeric"
            defaultValue={v.postalCode ?? a.postalCode}
            error={f.postalCode}
          />
        </div>
        <TextField
          label="Days to hand a package to the courier"
          name="dispatchDays"
          inputMode="numeric"
          defaultValue={v.dispatchDays ?? String(shop.dispatchDays)}
          error={f.dispatchDays}
          className="sm:w-80"
        />
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Payout bank account</h2>
          <p className="text-[13px] text-text-secondary">
            Teleshop pays your earnings by bank transfer. We keep only the bank, branch and last 4 digits here
            — the full account number is confirmed with you by phone before the first payout.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Bank"
            name="payoutBank"
            defaultValue={v.payoutBank ?? bank?.bank ?? ""}
            placeholder="Commercial Bank"
            icon={<Landmark />}
            error={f.payoutBank}
          />
          <TextField
            label="Branch"
            name="payoutBranch"
            defaultValue={v.payoutBranch ?? bank?.branch ?? ""}
            placeholder="Kandy"
            error={f.payoutBranch}
          />
          <TextField
            label="Account — last 4 digits"
            name="payoutLast4"
            inputMode="numeric"
            maxLength={4}
            defaultValue={v.payoutLast4 ?? bank?.last4 ?? ""}
            placeholder="1234"
            error={f.payoutLast4}
          />
        </div>
      </section>

      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

/** Cover photo at the top of the public shop page. */
export function ShopCoverForm({ coverUrl, shopName }: { coverUrl: string | null; shopName: string }) {
  const [state, action, pending] = useActionState(shopCoverAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <h2 className="font-display text-lg font-bold">Cover photo</h2>
      <div className="relative aspect-[3/1] overflow-hidden rounded-2xl border border-line bg-white/4">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${shopName} cover`}
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-cover"
          />
        ) : (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-text-secondary">
            A wide photo of your shop front works best (JPG, PNG or WebP, up to 4 MB).
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <form ref={formRef} action={action}>
          <input
            id="shop-cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={pending}
            onClick={() => document.getElementById("shop-cover")?.click()}
          >
            <ImagePlus aria-hidden /> {pending ? "Uploading…" : coverUrl ? "Change photo" : "Add photo"}
          </Button>
        </form>
        {coverUrl && (
          <form action={action}>
            <input type="hidden" name="intent" value="remove" />
            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
              <Trash2 aria-hidden /> Remove
            </Button>
          </form>
        )}
      </div>
      <FormMessage state={state} />
    </section>
  );
}
