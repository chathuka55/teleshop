import "server-only";
import { clientIp } from "./client-ip";
import { rateLimit, type RateLimitResult } from "./rate-limit";

/**
 * Per-minute limit for a Server Action (docs/09 §3). Signed-in callers are counted per account:
 * Sri Lankan mobile carriers put many customers behind one IP, so a per-IP limit on everyday
 * actions (cart, wishlist) would block strangers sharing it. Guests are counted per IP.
 */
export async function limitAction(
  scope: string,
  limit: number,
  userId?: string | null,
): Promise<RateLimitResult> {
  const who = userId ? `u:${userId}` : `ip:${(await clientIp()) ?? "unknown"}`;
  return rateLimit(`${scope}:${who}`, { limit, windowMs: 60_000 });
}
