import "server-only";
import { env } from "@/config/env";
import { logger } from "./logger";
import { pathOnly, scrubError, type ScrubbedError } from "./scrub";
import {
  authHeader,
  buildEnvelope,
  buildEvent,
  envelopeUrl,
  newEventId,
  parseDsn,
  type SentryContext,
} from "./sentry-envelope";

/**
 * `reportError(...)` — the one way server code reports an unexpected error (P8-T05):
 *  1. a scrubbed `error` log line (always — Vercel logs);
 *  2. a Sentry event when SENTRY_DSN is set (best effort, 2 s timeout, never throws).
 * Expected failures (validation, "out of stock", auth refusals) are results, not reports.
 */

export type ReportContext = {
  source: SentryContext["source"];
  /** Full URL or path; only the path is kept. */
  path?: string;
  method?: string;
  tags?: Record<string, string>;
};

const SEND_TIMEOUT_MS = 2000;

async function sendToSentry(error: ScrubbedError, ctx: ReportContext): Promise<void> {
  const dsn = parseDsn(env.SENTRY_DSN);
  if (!dsn) return;
  const event = buildEvent(
    error,
    {
      level: "error",
      source: ctx.source,
      environment: env.SENTRY_ENVIRONMENT ?? env.VERCEL_ENV ?? env.NODE_ENV,
      release: env.VERCEL_GIT_COMMIT_SHA,
      path: ctx.path,
      method: ctx.method,
      tags: ctx.tags,
    },
    newEventId(),
  );
  try {
    const res = await fetch(envelopeUrl(dsn), {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": authHeader(dsn) },
      body: buildEnvelope(event, dsn),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) logger.warn("sentry.rejected", { status: res.status });
  } catch {
    logger.warn("sentry.unreachable");
  }
}

export async function reportError(error: unknown, ctx: ReportContext): Promise<void> {
  const scrubbed = scrubError(error);
  const path = ctx.path ? pathOnly(ctx.path) : undefined;
  logger.error("error", {
    source: ctx.source,
    ...(path ? { path } : {}),
    ...(ctx.method ? { method: ctx.method } : {}),
    ...(ctx.tags ?? {}),
    error: scrubbed,
  });
  await sendToSentry(scrubbed, { ...ctx, path });
}
