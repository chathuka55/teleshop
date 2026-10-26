/** Public, non-secret site configuration. Safe to import from client components. */
export const siteConfig = {
  name: "Teleshop",
  tagline: "The future of tech, all in one place.",
  description:
    "Sri Lanka’s marketplace for mobile, computer and tech shops. Verified sellers, real specs, cash on delivery.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    phone: "+94 11 234 5678",
    email: "support@teleshop.lk",
    address: "No. 42, Galle Road, Colombo 03",
  },
  social: {
    facebook: "https://facebook.com/teleshop.lk",
    instagram: "https://instagram.com/teleshop.lk",
    youtube: "https://youtube.com/@teleshoplk",
    linkedin: "https://linkedin.com/company/teleshop-lk",
  },
  logo: {
    mark: "/images/brand/teleshop-mark.png",
    full: "/images/brand/teleshop-logo-full-600.png",
  },
} as const;

export type NavLink = {
  label: string;
  href: string;
  badge?: string;
  /** Path prefixes that also mark this link active (e.g. product pages under "Shop"). */
  match?: readonly string[];
};

export const DEALS_HREF = "/deals";

export const mainNav: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop", match: ["/p/", "/compare"] },
  { label: "Categories", href: "/shop", match: ["/c/"] },
  { label: "Deals", href: DEALS_HREF, badge: "HOT" },
  { label: "Sellers", href: "/sellers", match: ["/s/"] },
  { label: "About", href: "/about" },
];

/**
 * One active rule for every nav (desktop links, drawer, bottom bar): a link is active on its own
 * path or under one of its `match` prefixes. Query strings are ignored, so "/shop?sort=…" never
 * lights up a second item. "Categories" has no page of its own — only category pages activate it.
 */
export function isNavActive(link: Pick<NavLink, "label" | "href" | "match">, pathname: string): boolean {
  const own = link.label === "Categories" ? [] : [link.href.split(/[?#]/)[0] ?? "/"];
  return [...own, ...(link.match ?? [])].some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : prefix.endsWith("/")
        ? pathname.startsWith(prefix)
        : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const footerNav: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Mobile Phones", href: "/c/mobile-phones" },
      { label: "Laptops", href: "/c/laptops" },
      { label: "PC Components", href: "/c/pc-components" },
      { label: "Audio", href: "/c/audio" },
      { label: "Wearables", href: "/c/wearables" },
      { label: "Deals", href: DEALS_HREF },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Track My Order", href: "/track" },
      { label: "Shipping & Delivery", href: "/help#delivery" },
      { label: "Returns & Warranty", href: "/help#returns" },
      { label: "FAQ", href: "/help" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Sell on Teleshop",
    links: [
      { label: "Become a Seller", href: "/register/seller" },
      { label: "Seller Dashboard", href: "/seller" },
      { label: "Seller Guidelines", href: "/help#sellers" },
      { label: "Fees & Policies", href: "/help#fees" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/about#careers" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
    ],
  },
];
