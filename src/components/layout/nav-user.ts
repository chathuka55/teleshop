import "server-only";
import { getCurrentUser } from "@/lib/auth/guards";
import type { NavUser } from "./types";

/** Navbar user for layouts. A session/database hiccup shows the signed-out navbar, not an error page. */
export async function getNavUser(): Promise<NavUser | null> {
  try {
    const u = await getCurrentUser();
    return u ? { name: u.name, image: u.image, role: u.role } : null;
  } catch {
    return null;
  }
}
