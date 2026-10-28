import type { Metadata } from "next";
import { CircleCheck, Clock, ShieldAlert, XCircle } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { SellerApplicationForm } from "@/components/forms/AuthForms";
import { VerifyEmailBanner } from "@/components/forms/AccountForms";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/guards";
import { cn } from "@/lib/utils/cn";
import { getMyApplication } from "@/modules/sellers/seller";
import { sellerFeatures } from "../../auth-features";

export const metadata: Metadata = { title: "Register your shop", robots: { index: false } };

const steps = ["Account", "Shop details", "Verification"] as const;

function Steps({ current }: { current: number }) {
  return (
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
  );
}

function StatusCard({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Clock;
  tone: "primary" | "success" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const colour = { primary: "text-primary-light", success: "text-success", danger: "text-danger" }[tone];
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-line bg-surface p-5">
      <Icon aria-hidden className={cn("size-6 shrink-0", colour)} />
      <div className="text-sm text-text-secondary">
        <p className="mb-1 font-display text-lg font-bold text-text">{title}</p>
        {children}
      </div>
    </div>
  );
}

/** Figma "09 · Register — Seller" (11:1183). The signed-in user applies; an admin approves (P7). */
export default async function SellerRegisterPage() {
  const user = await getCurrentUser();
  const application = user ? await getMyApplication() : null;
  const approved = user?.role === "seller" && !!user.sellerId;
  const canApply = !!user && user.role === "customer" && (!application || application.status === "rejected");
  const current = !user ? 0 : canApply ? 1 : 2;

  return (
    <AuthShell
      headline="Grow your tech shop online."
      intro="List your products, manage stock and receive orders from customers island-wide — free to join."
      features={sellerFeatures}
    >
      <h1 className="font-display text-[32px] font-bold">Register your shop</h1>
      <p className="mt-1 text-sm text-text-secondary">Your application is reviewed within 24 hours.</p>
      <Steps current={current} />

      {!user ? (
        <StatusCard icon={ShieldAlert} tone="primary" title="Start with your Teleshop account">
          <p>
            Your shop is linked to your own account, so you can sign in to the seller dashboard with it.
            Create one (it&apos;s free) or sign in, then come back here.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/register">Create an account</ButtonLink>
            <ButtonLink href="/sign-in?next=%2Fregister%2Fseller" variant="glass">
              Sign in
            </ButtonLink>
          </div>
        </StatusCard>
      ) : approved ? (
        <StatusCard icon={CircleCheck} tone="success" title="Your shop is approved">
          <p>Manage products, stock and orders from your seller dashboard.</p>
          <ButtonLink href="/seller" className="mt-4">
            Open seller dashboard
          </ButtonLink>
        </StatusCard>
      ) : user.role === "admin" ? (
        <StatusCard icon={ShieldAlert} tone="danger" title="Staff accounts can't open a shop">
          <p>Sign in with the shop owner&apos;s own account instead.</p>
        </StatusCard>
      ) : application?.status === "pending" ? (
        <StatusCard icon={Clock} tone="primary" title={`${application.shopName} is being reviewed`}>
          <p>
            We check your business registration and usually reply within 24 hours. You&apos;ll get an email,
            and the seller dashboard opens here as soon as you&apos;re approved.
          </p>
        </StatusCard>
      ) : application?.status === "suspended" ? (
        <StatusCard icon={XCircle} tone="danger" title={`${application.shopName} is suspended`}>
          <p>Please contact support to find out why and what to do next.</p>
        </StatusCard>
      ) : (
        <div className="flex flex-col gap-4">
          {application?.status === "rejected" && (
            <StatusCard icon={XCircle} tone="danger" title="Your last application wasn't approved">
              <p>{application.rejectionReason ?? "Please check your details and apply again."}</p>
            </StatusCard>
          )}
          {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
          <SellerApplicationForm />
        </div>
      )}
    </AuthShell>
  );
}
