import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

/**
 * Rate limiter for docs/09-api.md §3 limits.
 * - Upstash Redis (sliding window) when UPSTASH_REDIS_REST_URL/TOKEN are set — shared across
 *   serverless instances; required in production by env.ts.
 * - In-memory fixed window otherwise (local dev without Upstash, unit tests), and as a
 *   fallback if Upstash is unreachable, so an outage degrades to per-instance limits
 *   instead of turning limits off or taking the site down.
 */

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };
type Options = { limit: number; windowMs: number };

// ---------- in-memory ----------
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function memoryRateLimit(
  key: string,
  { limit, windowMs }: Options,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}

// ---------- Upstash ----------
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<string, Ratelimit>();

function upstashLimiter(redisClient: Redis, { limit, windowMs }: Options): Ratelimit {
  const id = `${limit}:${windowMs}`;
  let rl = limiters.get(id);
  if (!rl) {
    rl = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "teleshop:rl",
      ephemeralCache: new Map(), // skip Redis for keys already known to be blocked
      analytics: false,
    });
    limiters.set(id, rl);
  }
  return rl;
}

/**
 * `key` should be "<scope>:<identifier>", e.g. `checkout:<userId>` or `auth:signin:<ip>`.
 * `now` is only used by the in-memory limiter (tests).
 */
export async function rateLimit(key: string, opts: Options, now?: number): Promise<RateLimitResult> {
  if (!redis) return memoryRateLimit(key, opts, now);
  try {
    const r = await upstashLimiter(redis, opts).limit(key);
    return {
      ok: r.success,
      remaining: r.remaining,
      retryAfterSeconds: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
    };
  } catch {
    // Upstash unreachable: fall back to this instance's memory instead of failing open.
    return memoryRateLimit(key, opts, now);
  }
}
