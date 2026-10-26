import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Lock, ScrollText, ShieldCheck } from "lucide-react";
import { SignInForm } from "@/components/forms/AuthForms";
import { EnrolTotpForm, VerifyTotpForm } from "@/components/forms/TwoFactorForms";
import { AuthShell, type AuthFeature } from "@/components/layout/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/route-access";
import { twoFactorScreen } from "@/modules/auth/two-factor";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

const adminFeatures: readonly AuthFeature[] = [
  { icon: Lock, title: "Password + authenticator app", text: "Two steps for every admin sign-in" },
  { icon: KeyRound, title: "Recovery codes", text: "Ten single-use codes if a phone is lost" },
  { icon: ScrollText, title: "Every action logged", text: "Sign-ins and changes go to the audit log" },
];

/**
 * Figma "A1 · Admin Login". Step 1: password (shared sign-in). Step 2: authenticator code — or,
 * the first time, setting it up with a QR code. middleware.ts sends every unverified admin here.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw, "/admin");
  const user = await getCurrentUser();

  if (user?.role === "admin" && user.twoFactorVerified) redirect(next);

  const screen = user?.role === "admin" ? await twoFactorScreen(user) : null;
  const title = !user
    ? "Admin sign in"
    : user.role !== "admin"
      ? "Admins only"
      : screen?.kind === "enrol"
        ? "Set up two-step verification"
        : "Two-step verification";

  return (
    <AuthShell
      headline="Teleshop admin console."
      intro="Orders, sellers and courier tracking — protected by two-step verification."
      features={adminFeatures}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary-light">
        <ShieldCheck aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 mb-6 font-display text-[30px] font-bold">{title}</h1>

      {!user && <SignInForm googleEnabled={false} next={`/admin/login?next=${encodeURIComponent(next)}`} />}

      {user && user.role !== "admin" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            This area is for Teleshop staff. You are signed in as {user.email}.
          </p>
          <ButtonLink href="/">Back to the shop</ButtonLink>
        </div>
      )}

      {screen?.kind === "enrol" && <EnrolTotpForm qr={screen.qr} manualKey={screen.manualKey} next={next} />}
      {screen?.kind === "verify" && <VerifyTotpForm next={next} recoveryLeft={screen.recoveryLeft} />}
    </AuthShell>
  );
}
