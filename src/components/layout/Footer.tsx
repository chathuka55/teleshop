import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { footerNav, siteConfig } from "@/config/site";
import { defaultCouriers } from "@/config/couriers";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "./Logo";

const socials = [
  { label: "Facebook", href: siteConfig.social.facebook, icon: "/images/icons/facebook.svg" },
  { label: "Instagram", href: siteConfig.social.instagram, icon: "/images/icons/instagram.svg" },
  { label: "YouTube", href: siteConfig.social.youtube, icon: "/images/icons/youtube.svg" },
  { label: "LinkedIn", href: siteConfig.social.linkedin, icon: "/images/icons/linkedin.svg" },
] as const;

/** Figma "Footer component" (7:215). */
export function Footer() {
  return (
    <footer className="border-t border-white/6 bg-surface pb-28 md:pb-8">
      <div className="container-page flex flex-col gap-12 pt-14 md:pt-[72px]">
        <div className="grid gap-10 lg:grid-cols-[340px_1fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-[320px] text-sm leading-relaxed text-text-secondary">
              {siteConfig.description}
            </p>
            <ul className="flex gap-2.5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-[38px] place-items-center rounded-xl border border-line bg-white/5 transition-colors hover:border-line-strong hover:bg-white/8"
                  >
                    <Image src={s.icon} alt="" width={16} height={16} />
                  </a>
                </li>
              ))}
            </ul>
            <address className="flex flex-col gap-3 text-[13px] text-text-secondary not-italic">
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 hover:text-text"
              >
                <Phone aria-hidden className="size-[15px] text-primary-light" />
                {siteConfig.contact.phone}
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-2.5 hover:text-text"
              >
                <Mail aria-hidden className="size-[15px] text-primary-light" />
                {siteConfig.contact.email}
              </a>
              <span className="flex items-center gap-2.5">
                <MapPin aria-hidden className="size-[15px] text-primary-light" />
                {siteConfig.contact.address}
              </span>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3.5 text-sm font-bold">{col.title}</h3>
                <ul className="flex flex-col gap-3.5 text-sm text-text-secondary">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="transition-colors hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.06em] text-text-muted">DELIVERY PARTNERS</span>
          {defaultCouriers.map((c) => (
            <span
              key={c.name}
              className="rounded-lg border border-line bg-white/4 px-3 py-1.5 text-xs font-semibold text-text-secondary"
            >
              {c.name}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-text-muted">
            © {new Date().getFullYear()} Teleshop (Pvt) Ltd. All rights reserved. ·{" "}
            <Link href="/credits" className="hover:text-text">
              Image credits
            </Link>
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="success" dot>
              Cash on Delivery
            </Badge>
            <Badge tone="primary" dot>
              Verified Sellers
            </Badge>
            <Badge tone="primary" dot>
              SSL Secured
            </Badge>
          </div>
        </div>
      </div>
    </footer>
  );
}
