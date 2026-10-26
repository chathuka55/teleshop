import "server-only";
import { headers } from "next/headers";

/**
 * Client IP for rate limits and (hashed) audit entries. On Vercel the first `x-forwarded-for`
 * entry is the client; locally it may be missing. Never use it for authorisation decisions.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
