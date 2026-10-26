import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { ButtonLink } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/**
 * Admin entry. middleware.ts admits verified admins only (password + TOTP); requireRole() checks
 * again on the server. The console (Figma A2–A14) is built in Phase 7.
 */
export default async function AdminHomePage() {
  const user = await requireRole("admin");
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main id="main" className="container-page grid min-h-[60vh] place-items-center py-16">
        <div className="flex max-w-md flex-col items-center rounded-[22px] border border-line bg-surface p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-success/12 text-success">
            <ShieldCheck aria-hidden className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You&apos;re signed in with two-step verification. The admin console — orders, tracking codes,
            sellers and reports — is built in the next phase.
          </p>
          <ButtonLink href="/account" className="mt-6">
            My account
          </ButtonLink>
        </div>
      </main>
      <Footer />
    </>
  );
}
