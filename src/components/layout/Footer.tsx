import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, PackageSearch, Phone, ShoppingBag, Store } from "lucide-react";
import { footerNav, siteConfig } from "@/config/site";
import { defaultCouriers } from "@/config/couriers";
import { BackToTop } from "./BackToTop";
import { FooterMotion } from "./FooterMotion";
import { Logo } from "./Logo";

const socials = [
  { label: "Facebook", href: siteConfig.social.facebook, icon: "/images/icons/facebook.svg" },
  { label: "Instagram", href: siteConfig.social.instagram, icon: "/images/icons/instagram.svg" },
  { label: "YouTube", href: siteConfig.social.youtube, icon: "/images/icons/youtube.svg" },
  { label: "LinkedIn", href: siteConfig.social.linkedin, icon: "/images/icons/linkedin.svg" },
] as const;

const promises = [
  "Verified sellers",
  "Cash on delivery",
  "Island-wide delivery",
  "Real specs, compared",
  "Warranty-backed",
  "Track every order",
] as const;

function Marquee({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {promises.map((p, i) => (
        <li key={p} className="flex items-center gap-10 px-5 whitespace-nowrap md:gap-12 md:px-6">
          <span>{p}</span>
          <span aria-hidden className={i % 2 ? "text-accent/70" : "text-primary-light/70"}>
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
}

const cta = [
  { label: "Shop all tech", href: "/shop", icon: ShoppingBag, primary: true },
  { label: "Sell on Teleshop", href: "/register/seller", icon: Store, primary: false },
  { label: "Track an order", href: "/track", icon: PackageSearch, primary: false },
] as const;

/**
 * Cinematic footer: aurora + grid backdrop, a giant outlined "TELESHOP", a tilted marquee of
 * promises, magnetic CTA pills, then the full link map. On wide and tall screens it is revealed
 * like a curtain (fixed under the page, see `curtain` in styles/footer.css); elsewhere it is a
 * normal block. Server component — FooterMotion and BackToTop are the only client code.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <div data-footer className="relative w-full [clip-path:inset(0)] curtain:h-dvh">
      <footer className="relative flex w-full flex-col overflow-hidden bg-surface-deep pb-28 text-text md:pb-0 curtain:fixed curtain:inset-x-0 curtain:bottom-0 curtain:h-dvh">
        {/* Ambient light, grid and the giant word (decorative) */}
        <div
          aria-hidden
          className="footer-aurora pointer-events-none absolute top-1/2 left-1/2 h-[60vh] w-[90vw] rounded-[50%] blur-[80px]"
        />
        <div aria-hidden className="footer-grid pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          data-footer-giant
          className="footer-giant-text pointer-events-none absolute bottom-[104px] left-1/2 -translate-x-1/2 font-display whitespace-nowrap select-none md:-bottom-[2vw]"
        >
          TELESHOP
        </div>

        {/* Tilted marquee of promises */}
        {/* the floating navbar sits on top of the footer at the end of the scroll — start below it */}
        <div className="relative z-10 mt-8 scale-110 -rotate-2 overflow-hidden border-y border-line bg-bg/60 py-3.5 shadow-2xl backdrop-blur-md md:mt-[104px] md:py-4">
          <div className="footer-marquee-track flex w-max text-[11px] font-bold tracking-[0.3em] text-text-secondary uppercase md:text-[13px]">
            <Marquee />
            <Marquee hidden />
          </div>
        </div>

        <div className="container-page relative z-10 flex flex-1 flex-col pt-14 md:pt-12">
          {/* Call to action */}
          <div data-footer-reveal className="flex flex-col items-center text-center">
            <h2 className="footer-text-glow pb-[0.14em] font-display text-[44px] leading-[1.1] font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Ready to upgrade?
            </h2>
            <p className="mt-4 max-w-[480px] text-sm text-text-secondary md:text-base">
              Phones, laptops and PC parts from verified Sri Lankan shops — pay cash when it arrives.
            </p>
            <ul className="mt-7 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center md:gap-4">
              {cta.map(({ label, href, icon: Icon, primary }) => (
                <li key={href}>
                  <Link
                    href={href}
                    data-magnetic
                    className={`footer-pill group flex h-[52px] items-center justify-center gap-2.5 rounded-full px-7 text-sm font-semibold md:h-14 md:px-8 md:text-[15px] ${
                      primary ? "footer-pill-primary" : "text-text-secondary"
                    }`}
                  >
                    <Icon aria-hidden className="size-[18px]" />
                    {label}
                    {primary && (
                      <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Link map */}
          <div
            data-footer-reveal
            className="mt-14 grid gap-10 border-t border-line pt-10 md:mt-auto md:mb-8 md:pt-8 lg:grid-cols-[300px_1fr] lg:gap-14"
          >
            <div className="flex flex-col gap-4">
              <Logo />
              <address className="flex flex-col gap-2.5 text-[13px] text-text-secondary not-italic">
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
              <ul className="flex gap-2.5">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      data-magnetic
                      className="footer-pill grid size-10 place-items-center rounded-full"
                    >
                      <Image src={s.icon} alt="" width={16} height={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {footerNav.map((col) => (
                <div key={col.title}>
                  <h3 className="mb-3 text-[13px] font-bold tracking-[0.08em] text-text uppercase">
                    {col.title}
                  </h3>
                  <ul className="flex flex-col gap-2.5 text-[13px] text-text-secondary">
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
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="container-page relative z-20 flex flex-col items-center gap-5 pt-10 pb-8 md:flex-row md:justify-between md:pt-0 md:pb-7">
          <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">
              © {year} Teleshop (Pvt) Ltd ·{" "}
              <Link href="/credits" className="hover:text-text">
                Image credits
              </Link>
            </p>
            <p className="flex flex-wrap justify-center gap-x-2 text-[11px] text-text-muted md:justify-start">
              <span className="font-semibold tracking-[0.14em] uppercase">Delivery partners</span>
              {defaultCouriers.map((c) => (
                <span key={c.name}>{c.name}</span>
              ))}
            </p>
          </div>

          <BackToTop />
        </div>
      </footer>
      <FooterMotion />
    </div>
  );
}
