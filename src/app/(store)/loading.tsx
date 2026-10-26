import Image from "next/image";
import { siteConfig } from "@/config/site";

/** Shown while a storefront page streams in after a client-side navigation (shop, product…). */
export default function StoreLoading() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16" role="status">
      <div className="flex flex-col items-center gap-5">
        <Image src={siteConfig.logo.mark} alt="" width={48} height={48} className="splash-mark" />
        <div className="splash-bar" />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
