import type { Metadata } from "next";
import { Store } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { ButtonLink } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Seller dashboard", robots: { index: false } };

/**
 * Seller area entry point. middleware.ts admits approved sellers only; requireRole() checks again
 * on the server. The dashboard itself (Figma S1–S4) is built in Phase 6.
 */
export default async function SellerHomePage() {
  const user = await requireRole("seller");
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main id="main" className="container-page grid min-h-[60vh] place-items-center py-16">
        <div className="flex max-w-md flex-col items-center rounded-[22px] border border-line bg-surface p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary-light">
            <Store aria-hidden className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Welcome, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your shop is approved. The seller dashboard — products, stock, orders and payouts — is being built
            and opens here soon.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/account">My account</ButtonLink>
            <ButtonLink href="/sellers" variant="glass">
              View shops
            </ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
