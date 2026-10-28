import { createHash, timingSafeEqual } from "node:crypto";

/**
 * True when a request carries Vercel Cron's `Authorization: Bearer <CRON_SECRET>`. Without a
 * configured secret nothing is accepted. Compared as SHA-256 digests in constant time, so neither
 * the content nor the length of the secret leaks through timing.
 */
export function isCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const digest = (v: string): Buffer => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(authorization.slice(7)), digest(secret));
}
