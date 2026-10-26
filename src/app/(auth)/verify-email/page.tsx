import type { Metadata } from "next";
import { CircleCheck, CircleX } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { clientIp } from "@/lib/security/client-ip";
import { verifyEmail } from "@/modules/auth/service";
import { customerFeatures } from "../auth-features";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

/** Target of the verification email link. The token works once and expires after 24 hours. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const raw = (await searchParams).token;
  const ok = await verifyEmail(Array.isArray(raw) ? raw[0] : raw, { ip: await clientIp() });
  const Icon = ok ? CircleCheck : CircleX;

  return (
    <AuthShell
      headline="One account for every tech shop."
      intro="A verified email lets you check out with Cash on Delivery and get order updates."
      features={customerFeatures}
    >
      <span
        className={
          ok
            ? "grid size-12 place-items-center rounded-2xl border border-success/30 bg-success/12 text-success"
            : "grid size-12 place-items-center rounded-2xl border border-danger/30 bg-danger/12 text-danger"
        }
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <h1 className="mt-5 font-display text-[32px] font-bold">{ok ? "Email verified" : "Link not valid"}</h1>
      <p className="mt-2 mb-7 text-sm text-text-secondary">
        {ok
          ? "Thanks! Your email is confirmed — you can now check out with Cash on Delivery."
          : "This verification link is invalid, already used or older than 24 hours. Sign in to send a new one."}
      </p>
      <ButtonLink href="/sign-in" size="lg" className="w-full">
        {ok ? "Continue to sign in" : "Sign in"}
      </ButtonLink>
    </AuthShell>
  );
}
