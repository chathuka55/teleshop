import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";
import { customerFeatures } from "../auth-features";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

/** Figma "10 · Forgot Password" (11:1347). */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      headline="Locked out? It happens."
      intro="We’ll email you a secure link to choose a new password. The link works once and expires in 30 minutes."
      features={customerFeatures}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary-light">
        <KeyRound aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-bold">Forgot your password?</h1>
      <p className="mt-1 mb-7 text-sm text-text-secondary">Enter the email you signed up with.</p>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
