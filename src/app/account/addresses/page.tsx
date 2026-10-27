import type { Metadata } from "next";
import { MapPin, Trash2 } from "lucide-react";
import { AddressForm } from "@/components/forms/AddressForm";
import { Badge } from "@/components/ui/Badge";
import { formatPhoneLK } from "@/lib/utils/strings";
import { deleteAddressAction } from "@/modules/addresses/actions";
import { MAX_ADDRESSES } from "@/modules/addresses/access";
import { listMyAddresses } from "@/modules/addresses/service";

export const metadata: Metadata = { title: "Saved addresses", robots: { index: false } };

/** Figma "22 · Saved Addresses" (P4-T03). */
export default async function AddressesPage() {
  const addresses = await listMyAddresses();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Saved addresses
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Used at checkout for Cash on Delivery. Up to {MAX_ADDRESSES} addresses.
        </p>
      </header>

      {addresses.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-[20px] border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-light" />
                  <div className="text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {a.recipientName}
                      <Badge size="xs">{a.label}</Badge>
                      {a.isDefault && (
                        <Badge tone="success" size="xs">
                          Default
                        </Badge>
                      )}
                    </p>
                    <address className="mt-1 text-text-secondary not-italic">
                      {a.line1}
                      {a.line2 && `, ${a.line2}`}
                      <br />
                      {a.city}, {a.district}
                      {a.postalCode && ` ${a.postalCode}`}
                      <br />
                      {formatPhoneLK(a.phone)}
                    </address>
                  </div>
                </div>
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label={`Delete address ${a.line1}`}
                    className="grid size-9 place-items-center rounded-xl text-text-muted hover:bg-white/5 hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </form>
              </div>
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-[13px] font-semibold text-primary-light hover:text-text">
                  Edit
                </summary>
                <div className="mt-4">
                  <AddressForm address={a} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {addresses.length < MAX_ADDRESSES && (
        <section
          aria-labelledby="add-address"
          className="rounded-[20px] border border-line bg-surface p-5 md:p-6"
        >
          <h2 id="add-address" className="mb-4 font-display text-xl font-bold">
            {addresses.length ? "Add another address" : "Add your delivery address"}
          </h2>
          <AddressForm submitLabel="Add address" />
        </section>
      )}
    </div>
  );
}
