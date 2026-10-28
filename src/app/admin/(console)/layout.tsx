import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { getCurrentUser } from "@/lib/auth/guards";
import { adminDashboard } from "@/modules/admin/session";

/**
 * Admin console (Phase 7). middleware.ts admits admins who passed TOTP only; the layout checks
 * again, and every service repeats assertRole("admin"). /admin/login sits outside this group.
 */
export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !user.twoFactorVerified) redirect("/admin/login");
  const counts = await adminDashboard();
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main
        id="main"
        className="container-page grid min-h-[60vh] gap-6 pt-8 pb-16 lg:grid-cols-[220px_1fr] lg:gap-10"
      >
        <aside className="min-w-0 lg:pt-1">
          <AdminSidebar pendingShops={counts.pendingSellers} productsInReview={counts.productsInReview} />
        </aside>
        <div className="min-w-0">{children}</div>
      </main>
      <Footer />
    </>
  );
}
