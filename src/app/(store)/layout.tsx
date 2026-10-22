import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

/** Storefront chrome. Session + cart count are wired in P2-T06 / P4-T02. */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar user={null} cartCount={0} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
    </>
  );
}
