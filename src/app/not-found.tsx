import Link from "next/link";
import { Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <Logo />
        <p className="text-gradient-brand mt-10 font-display text-[88px] leading-none font-bold">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">This page went offline</h1>
        <p className="mt-2 text-text-secondary">The link may be old, or the product is no longer listed.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/shop" variant="glass">
            <Search aria-hidden /> Browse products
          </ButtonLink>
        </div>
        <Link href="/help" className="mt-6 text-sm text-primary-light hover:text-text">
          Visit the Help Centre
        </Link>
      </div>
    </main>
  );
}
