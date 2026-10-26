import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AccountSidebar } from "@/components/layout/AccountSidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { getCurrentUser } from "@/lib/auth/guards";

/**
 * Account area (P2-T06). middleware.ts already sends guests to sign-in; the layout checks again
 * on the server (a stale or revoked session lands here without a user).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount");
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main
        id="main"
        className="container-page grid min-h-[60vh] gap-6 pt-8 pb-16 lg:grid-cols-[240px_1fr] lg:gap-10"
      >
        <aside className="lg:pt-1">
          <AccountSidebar seller={user.role === "seller" && !!user.sellerId} />
        </aside>
        <div className="min-w-0">{children}</div>
      </main>
      <Footer />
      <BottomTabBar />
    </>
  );
}
