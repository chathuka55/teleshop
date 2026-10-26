import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Package, ShieldCheck } from "lucide-react";
import {
  ChangePasswordForm,
  ProfileForm,
  SignOutEverywhereButton,
  VerifyEmailBanner,
} from "@/components/forms/AccountForms";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils/strings";
import { getMyProfile } from "@/modules/users/service";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

/** Figma "11 · My Account — Overview & Profile" (/account · /account#security). */
export default async function AccountPage() {
  const me = await getMyProfile();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-primary-light to-[#1e40af] font-display text-xl font-bold">
          {initials(me.name)}
        </span>
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
            Hi, {me.name.split(" ")[0]}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {me.email}
            {me.emailVerified ? (
              <Badge tone="success" size="xs">
                Verified
              </Badge>
            ) : (
              <Badge tone="accent" size="xs">
                Not verified
              </Badge>
            )}
          </p>
        </div>
      </header>

      {!me.emailVerified && <VerifyEmailBanner email={me.email} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 hover:border-line-strong"
        >
          <Package aria-hidden className="size-5 text-primary-light" />
          <span>
            <span className="block font-semibold">My orders</span>
            <span className="text-[13px] text-text-secondary">
              Track packages and Cash on Delivery orders
            </span>
          </span>
        </Link>
        <Link
          href="/account/wishlist"
          className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 hover:border-line-strong"
        >
          <Heart aria-hidden className="size-5 text-primary-light" />
          <span>
            <span className="block font-semibold">Wishlist</span>
            <span className="text-[13px] text-text-secondary">Products you saved with the heart</span>
          </span>
        </Link>
      </div>

      <section aria-labelledby="profile" className="rounded-[20px] border border-line bg-surface p-5 md:p-6">
        <h2 id="profile" className="mb-4 font-display text-xl font-bold">
          Profile
        </h2>
        <ProfileForm name={me.name} phone={me.phone} email={me.email} />
      </section>

      <section
        id="security"
        aria-labelledby="security-h"
        className="rounded-[20px] border border-line bg-surface p-5 md:p-6"
      >
        <h2 id="security-h" className="mb-1 flex items-center gap-2 font-display text-xl font-bold">
          <ShieldCheck aria-hidden className="size-5 text-primary-light" /> Security
        </h2>
        <p className="mb-5 text-sm text-text-secondary">
          Accounts lock for 15 minutes after 5 wrong passwords. Every sign-in is recorded.
        </p>
        {me.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-text-secondary">
            You sign in with Google, so there is no Teleshop password to change.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">Lost a phone or used a shared computer?</p>
          <SignOutEverywhereButton />
        </div>
      </section>
    </div>
  );
}
