import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/lib/security/headers";
import { getEnv } from "./src/config/env";
import { BLOB_PUBLIC_HOST } from "./src/config/storage";

// Validates every environment variable at start-up / build (P0-T03). Throws on bad env.
getEnv();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Our public Upstash Blob bucket only (ADR-005).
    remotePatterns: [{ protocol: "https", hostname: BLOB_PUBLIC_HOST, pathname: "/**" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...staticSecurityHeaders] },
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
