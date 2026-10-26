import type { Metadata } from "next";
import { User } from "lucide-react";
import { env } from "@/config/env";
import { safeNextPath } from "@/lib/auth/route-access";
import { AuthShell } from "@/components/layout/AuthShell";
import { SignInForm } from "@/components/forms/AuthForms";
import { customerFeatures } from "../auth-features";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/** Figma "07 · Sign In" (11:887) / "M6" (24:3461). */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw, "");
  return (
    <AuthShell
      headline="Welcome back to the future of tech."
      intro="Sign in to track orders, save favourites and check out faster with Cash on Delivery."
      features={customerFeatures}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary-light">
        <User aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-bold">Sign in</h1>
      <p className="mt-1 mb-7 text-sm text-text-secondary">
        Good to see you again. Enter your details below.
      </p>
      <SignInForm googleEnabled={!!env.AUTH_GOOGLE_ID && !!env.AUTH_GOOGLE_SECRET} next={next || undefined} />
    </AuthShell>
  );
}
