import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { getCurrentUser } from "@/lib/auth/guards";
import { getMyShopNav } from "@/modules/fulfilment/seller";

/**
 * Seller portal (Phase 6). middleware.ts admits approved sellers only; the layout checks again and
 * every service repeats requireRole("seller") with the shop's own id.
 */
export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "seller" || !user.sellerId) redirect("/register/seller");
  const nav = await getMyShopNav();
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main
        id="main"
        className="container-page grid min-h-[60vh] gap-6 pt-8 pb-16 lg:grid-cols-[240px_1fr] lg:gap-10"
      >
        <aside className="lg:pt-1">
          <SellerSidebar shopName={nav.shopName} newOrders={nav.newOrders} />
        </aside>
        <div className="min-w-0">{children}</div>
      </main>
      <Footer />
    </>
  );
}
