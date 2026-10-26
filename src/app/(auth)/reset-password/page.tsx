import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { ResetPasswordForm } from "@/components/forms/AuthForms";
import { customerFeatures } from "../auth-features";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/** Target of the reset email link (30 min, single use). The token is checked when the form is sent. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  return (
    <AuthShell
      headline="Back in a moment."
      intro="Choose a new password. For your safety you'll be signed out on every other device."
      features={customerFeatures}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary-light">
        <KeyRound aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-bold">Choose a new password</h1>
      <p className="mt-1 mb-7 text-sm text-text-secondary">
        Use at least 10 characters — a short sentence works well.
      </p>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
