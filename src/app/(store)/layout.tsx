import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";

/** Storefront chrome. Cart count is wired in P4-T02. */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
    </>
  );
}
