import type { Metadata } from "next";
import { env } from "@/config/env";
import { AuthShell } from "@/components/layout/AuthShell";
import { RegisterForm } from "@/components/forms/AuthForms";
import { customerFeatures } from "../auth-features";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

/** Figma "08 · Register — Customer" (11:1022) / "M8" (26:2775). */
export default function RegisterPage() {
  return (
    <AuthShell
      headline="Join Sri Lanka’s tech marketplace."
      intro="Create a free account to order with Cash on Delivery and follow every package to your door."
      features={customerFeatures}
    >
      <h1 className="font-display text-[32px] font-bold">Create your account</h1>
      <p className="mt-1 mb-7 text-sm text-text-secondary">It takes less than a minute.</p>
      <RegisterForm googleEnabled={!!env.AUTH_GOOGLE_ID} />
    </AuthShell>
  );
}
