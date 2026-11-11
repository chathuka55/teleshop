import type { ScrubbedError } from "./scrub";

/**
 * Minimal Sentry client (P8-T05): builds an error event and wraps it in Sentry's documented
 * "envelope" format (https://develop.sentry.dev/sdk/envelopes/), sent with one fetch from the
 * server. No SDK, so nothing is added to the browser bundle and the CSP is unchanged.
 * Everything here is pure; sending lives in report.ts. Input errors are already scrubbed.
 */

export type SentryDsn = { publicKey: string; origin: string; projectId: string; pathPrefix: string };

/** `https://<key>@o123.ingest.sentry.io/<project>` → its parts; null when it isn't a DSN. */
export function parseDsn(dsn: string | undefined): SentryDsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const segments = url.pathname.split("/").filter(Boolean);
    const projectId = segments.pop();
    if (!url.username || !projectId || !/^\d+$/.test(projectId)) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      publicKey: url.username,
      origin: `${url.protocol}//${url.host}`,
      projectId,
      pathPrefix: segments.length ? `/${segments.join("/")}` : "",
    };
  } catch {
    return null;
  }
}

export function envelopeUrl(dsn: SentryDsn): string {
  return `${dsn.origin}${dsn.pathPrefix}/api/${dsn.projectId}/envelope/`;
}

export function authHeader(dsn: SentryDsn): string {
  return `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=teleshop/1.0`;
}

type Frame = { function?: string; filename: string; lineno?: number; colno?: number; in_app: boolean };

/** One V8 stack line: `at fn (file:line:col)` or `at file:line:col`. String ops, no regex. */
function parseFrame(raw: string): Frame | null {
  const line = raw.trim();
  if (!line.startsWith("at ")) return null;
  let rest = line.slice(3);
  let fn: string | undefined;
  const open = rest.lastIndexOf(" (");
  if (rest.endsWith(")") && open > 0) {
    fn = rest.slice(0, open);
    rest = rest.slice(open + 2, -1);
  }
  const colAt = rest.lastIndexOf(":");
  const lineAt = rest.lastIndexOf(":", colAt - 1);
  if (lineAt <= 0) return null;
  const lineno = Number(rest.slice(lineAt + 1, colAt));
  const colno = Number(rest.slice(colAt + 1));
  if (!Number.isInteger(lineno) || !Number.isInteger(colno)) return null;
  const filename = rest.slice(0, lineAt);
  return {
    ...(fn ? { function: fn } : {}),
    filename,
    lineno,
    colno,
    in_app: !(filename.includes("node_modules") || filename.startsWith("node:")),
  };
}

/** V8 stack text → Sentry frames, oldest call first (Sentry's order). */
export function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(1, 51)) {
    const frame = parseFrame(line);
    if (frame) frames.push(frame);
  }
  return frames.reverse();
}

export type SentryContext = {
  level: "error" | "warning";
  /** server: request handlers / rendering · client: browser error pages · job: cron */
  source: "server" | "client" | "job";
  environment: string;
  release?: string;
  /** Path only — never the query string. */
  path?: string;
  method?: string;
  tags?: Record<string, string>;
};

export type SentryEvent = Record<string, unknown> & { event_id: string };

export function buildEvent(
  error: ScrubbedError,
  ctx: SentryContext,
  eventId: string,
  now = new Date(),
): SentryEvent {
  return {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: ctx.source === "client" ? "javascript" : "node",
    level: ctx.level,
    environment: ctx.environment,
    ...(ctx.release ? { release: ctx.release } : {}),
    // Never send the user, IP or request headers/body (docs/10). Sentry must not infer them either.
    user: { ip_address: null },
    tags: { source: ctx.source, ...(error.digest ? { digest: error.digest } : {}), ...ctx.tags },
    ...(ctx.path
      ? { transaction: ctx.path, request: { url: ctx.path, ...(ctx.method ? { method: ctx.method } : {}) } }
      : {}),
    exception: {
      values: [{ type: error.name, value: error.message, stacktrace: { frames: parseStack(error.stack) } }],
    },
  };
}

/** Envelope = header line, item header line, item payload — newline separated. */
export function buildEnvelope(event: SentryEvent, dsn: SentryDsn, now = new Date()): string {
  const payload = JSON.stringify(event);
  return [
    JSON.stringify({ event_id: event.event_id, sent_at: now.toISOString() }),
    JSON.stringify({
      type: "event",
      content_type: "application/json",
      length: new TextEncoder().encode(payload).length,
    }),
    payload,
  ].join("\n");
}

/** 32 hex chars, as Sentry wants event ids. */
export function newEventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
