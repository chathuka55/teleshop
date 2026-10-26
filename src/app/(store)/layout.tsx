import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import type { NavUser } from "@/components/layout/types";
import { getCurrentUser } from "@/lib/auth/guards";

/** Storefront chrome. Cart count is wired in P4-T02. */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  const user = await navUser();
  return (
    <>
      <Navbar user={user} cartCount={0} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
    </>
  );
}

/** A session/database hiccup shows the signed-out navbar instead of an error page. */
async function navUser(): Promise<NavUser | null> {
  try {
    const u = await getCurrentUser();
    return u ? { name: u.name, image: u.image, role: u.role } : null;
  } catch {
    return null;
  }
}
