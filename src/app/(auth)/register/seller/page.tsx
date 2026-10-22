import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/AuthShell";
import { SellerApplicationForm } from "@/components/forms/AuthForms";
import { cn } from "@/lib/utils/cn";
import { sellerFeatures } from "../../auth-features";

export const metadata: Metadata = { title: "Register your shop", robots: { index: false } };

const steps = ["Account", "Shop details", "Verification"] as const;

/** Figma "09 · Register — Seller" (11:1183). */
export default function SellerRegisterPage() {
  const current = 1;
  return (
    <AuthShell
      headline="Grow your tech shop online."
      intro="List your products, manage stock and receive orders from customers island-wide — free to join."
      features={sellerFeatures}
    >
      <h1 className="font-display text-[32px] font-bold">Register your shop</h1>
      <p className="mt-1 text-sm text-text-secondary">Your application is reviewed within 24 hours.</p>
      <ol className="mt-5 mb-7 flex items-center gap-2 text-xs" aria-label="Registration steps">
        {steps.map((s, i) => (
          <li
            key={s}
            className="flex flex-1 items-center gap-2 last:flex-none"
            aria-current={i === current ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full font-semibold",
                i <= current ? "bg-primary text-on-primary" : "bg-surface-2 text-text-secondary",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("whitespace-nowrap", i <= current ? "font-semibold" : "text-text-secondary")}>
              {s}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn("h-px flex-1", i < current ? "bg-primary-light" : "bg-line")} />
            )}
          </li>
        ))}
      </ol>
      <SellerApplicationForm />
    </AuthShell>
  );
}
