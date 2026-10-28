import type { Metadata } from "next";
import { CourierForm, SettingsForm } from "@/components/admin/ConfigForms";
import { Badge } from "@/components/ui/Badge";
import { adminCouriersAll, adminSettings } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Settings — Admin", robots: { index: false } };

/** Figma "A13 · Admin — Couriers & settings" (P7-T05). */
export default async function AdminSettingsPage() {
  const [settings, couriers] = await Promise.all([adminSettings(), adminCouriersAll()]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Settings</h1>

      <section className="rounded-[20px] border border-line bg-surface p-5">
        <h2 className="mb-1 font-display text-lg font-bold">Checkout and fees</h2>
        {!settings.codEnabled && (
          <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            Cash on Delivery is OFF — customers can&apos;t place orders.
          </p>
        )}
        <SettingsForm
          deliveryFeeCents={settings.deliveryFeeCents}
          expressFeeCents={settings.expressFeeCents}
          codEnabled={settings.codEnabled}
          platformFeeBp={settings.platformFeeBp}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Couriers</h2>
          <p className="text-sm text-text-secondary">
            The tracking panel checks every code against the courier&apos;s format and builds the
            customer&apos;s link from the template.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {couriers.map((c) => (
            <li key={c.id}>
              <details className="group rounded-2xl border border-line bg-white/3 px-4 py-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  {!c.isActive && (
                    <Badge tone="neutral" size="xs">
                      off
                    </Badge>
                  )}
                  <code className="font-mono text-xs text-text-secondary">{c.codePattern}</code>
                  <span className="ml-auto text-xs text-text-muted">
                    {c.shipments} shipment{c.shipments === 1 ? "" : "s"} · edit
                  </span>
                </summary>
                <div className="mt-4">
                  <CourierForm courier={c} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="rounded-2xl border border-dashed border-line px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary-light">Add a courier</summary>
          <div className="mt-4">
            <CourierForm />
          </div>
        </details>
      </section>
    </div>
  );
}
