import { sellerPhotoCredits } from "./seller-photo-credits";

/**
 * Shop-page extras for the demo sellers (migration 0006 + seed). The shops are fictional; the
 * pins are approximate points on the street in each address. Real sellers set these themselves
 * in the seller portal (Phase 6).
 */
export type DemoShopProfile = {
  location: { lat: number; lng: number };
  openingHours: string;
  description: string;
};

export const demoShopProfiles: Readonly<Record<string, DemoShopProfile>> = {
  "istore-colombo": {
    location: { lat: 6.9106, lng: 79.8508 }, // Galle Road, Kollupitiya
    openingHours: "Mon–Sat 9.30–19.30 · Sun 10.00–16.00",
    description:
      "Colombo's go-to shop for iPhone, iPad, Mac and Apple Watch since 2019. Every device is brand new with full manufacturer warranty, and our team sets up your new phone and moves your data before you leave.",
  },
  "pc-forge": {
    location: { lat: 7.2862, lng: 80.6302 }, // Peradeniya Road, Kandy
    openingHours: "Mon–Sat 9.00–18.30",
    description:
      "Custom gaming PCs, workstations and every part to build your own — CPUs, GPUs, SSDs and more. We test every build for 24 hours before it ships and help you pick parts that work together.",
  },
  "gadget-lab": {
    location: { lat: 6.0412, lng: 80.2186 }, // Wakwella Road, Galle
    openingHours: "Mon–Sat 9.00–19.00 · Sun 10.00–14.00",
    description:
      "Laptops, monitors and smart gadgets for work and play, with honest advice and fair prices on the south coast. Ask us to compare models side by side in store.",
  },
  "mobile-hub-kandy": {
    location: { lat: 7.2936, lng: 80.6394 }, // Dalada Veediya, Kandy
    openingHours: "Daily 9.00–20.00",
    description:
      "Smartphones from every major brand plus certified refurbished phones, accessories and same-day screen protection fitting in the heart of Kandy.",
  },
  soundwave: {
    location: { lat: 6.9148, lng: 79.8667 }, // Ward Place, Colombo 07
    openingHours: "Tue–Sun 10.00–19.00",
    description:
      "Headphones, earbuds and speakers from Sony, JBL, Apple and more. Try before you buy in our listening corner and get help choosing the right sound for you.",
  },
};

export type DemoShopPhoto = { url: string; alt: string; width: number; height: number };

/** Demo shop photos per slug (Wikimedia Commons, credited on /credits); the first is the cover. */
export function demoShopPhotos(): Map<string, DemoShopPhoto[]> {
  const bySlug = new Map<string, DemoShopPhoto[]>();
  for (const c of [...sellerPhotoCredits].sort((a, b) => a.position - b.position)) {
    const list = bySlug.get(c.slug) ?? [];
    list.push({ url: c.file, alt: "", width: c.width, height: c.height });
    bySlug.set(c.slug, list);
  }
  return bySlug;
}
