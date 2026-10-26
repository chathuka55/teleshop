import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Self-hosted (SIL OFL 1.1, latin subset, variable weight) so builds never depend on Google Fonts.
const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-var.woff2",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_LK",
    images: [{ url: siteConfig.logo.full, width: 600, height: 600, alt: "Teleshop" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Per-request CSP nonce (middleware.ts) requires dynamic rendering; Next reads the nonce from
  // the request CSP header and applies it to its own scripts (docs/10 §2).
  await headers();
  return (
    <html lang="en-LK" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-dvh">
        <SplashScreen />
        <a
          href="#main"
          className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
