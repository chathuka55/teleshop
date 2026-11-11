import Image from "next/image";
import { siteConfig } from "@/config/site";

/**
 * Shown while a storefront page streams in after a client-side navigation (shop, product…).
 * Next also sends it first on a full page load (under the splash), so it fills the screen: the
 * footer stays below the fold until the page arrives and nothing visible jumps (CLS, P8-T02).
 */
export default function StoreLoading() {
  return (
    <div className="container-page grid min-h-dvh place-items-center py-16" role="status">
      <div className="flex flex-col items-center gap-5">
        <Image src={siteConfig.logo.mark} alt="" width={48} height={48} className="splash-mark" />
        <div className="splash-bar" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
