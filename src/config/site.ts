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

export type NavLink = { label: string; href: string; badge?: string };

export const mainNav: readonly NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/shop#categories" },
  { label: "Deals", href: "/shop?sort=discount", badge: "HOT" },
  { label: "Sellers", href: "/sellers" },
  { label: "About", href: "/about" },
];

export const footerNav: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Mobile Phones", href: "/c/mobile-phones" },
      { label: "Laptops", href: "/c/laptops" },
      { label: "PC Components", href: "/c/pc-components" },
      { label: "Audio", href: "/c/audio" },
      { label: "Wearables", href: "/c/wearables" },
      { label: "Deals", href: "/shop?sort=discount" },
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
