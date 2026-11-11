import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getNavUser } from "@/components/layout/nav-user";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

/** Storefront chrome. Cart count is wired in P4-T02. */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar user={await getNavUser()} cartCount={0} />
      {/* flow-root: the home hero's negative top margin (it slides under the navbar) must not
          collapse through <main> — that moved <main> itself when the page replaced loading.tsx. */}
      <main id="main" className="flow-root min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
      <ScrollReveal />
    </>
  );
}
