import "server-only";
import { createHash } from "node:crypto";

const RANGE_API = "https://api.pwnedpasswords.com/range/";

/**
 * Breached-password check (docs/10 §1) using Have I Been Pwned's k-anonymity API: only the first
 * 5 hex chars of the SHA-1 leave the server, never the password. Fails open (returns false) on a
 * network error or timeout so an outage can't block sign-ups.
 */
export async function isBreachedPassword(
  password: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
): Promise<boolean> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetchImpl(`${RANGE_API}${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Teleshop" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
