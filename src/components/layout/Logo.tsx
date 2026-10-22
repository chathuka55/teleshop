import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

/** Figma "Logo" (7:97): 40px mark + "Tele" / gradient "shop" wordmark. */
export function Logo({
  className,
  size = 40,
  href = "/",
}: {
  className?: string;
  size?: number;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} home`}
      className={cn("flex items-center gap-2.5", className)}
    >
      <Image src={siteConfig.logo.mark} alt="" width={size} height={size} priority className="shrink-0" />
      <span className="font-display text-[22px] font-bold tracking-[-0.01em]">
        <span className="text-text">Tele</span>
        <span className="text-gradient-primary">shop</span>
      </span>
    </Link>
  );
}
