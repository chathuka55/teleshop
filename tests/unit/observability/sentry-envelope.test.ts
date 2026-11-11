import { describe, expect, it } from "vitest";
import { formatLogLine } from "@/lib/observability/logger";
import { scrubError } from "@/lib/observability/scrub";
import {
  authHeader,
  buildEnvelope,
  buildEvent,
  envelopeUrl,
  newEventId,
  parseDsn,
  parseStack,
} from "@/lib/observability/sentry-envelope";

const DSN = "https://abc123publickey@o4501.ingest.sentry.io/4505";

describe("parseDsn", () => {
  it("splits a Sentry DSN", () => {
    const dsn = parseDsn(DSN);
    expect(dsn).toEqual({
      publicKey: "abc123publickey",
      origin: "https://o4501.ingest.sentry.io",
      projectId: "4505",
      pathPrefix: "",
    });
    expect(envelopeUrl(dsn!)).toBe("https://o4501.ingest.sentry.io/api/4505/envelope/");
    expect(authHeader(dsn!)).toContain("sentry_key=abc123publickey");
  });

  it("keeps a self-hosted path prefix", () => {
    const dsn = parseDsn("https://key@sentry.example.com/errors/7")!;
    expect(envelopeUrl(dsn)).toBe("https://sentry.example.com/errors/api/7/envelope/");
  });

  it.each([undefined, "", "not a url", "https://sentry.io/4505", "https://key@sentry.io/", "ftp://k@h/1"])(
    "rejects %s",
    (value) => {
      expect(parseDsn(value)).toBeNull();
    },
  );
});

describe("parseStack", () => {
  it("turns V8 frames into Sentry frames, oldest first", () => {
    const stack = [
      "Error: boom",
      "    at placeOrder (/var/task/.next/server/chunks/123.js:10:5)",
      "    at async handler (/var/task/node_modules/next/dist/server/base.js:20:7)",
      "    at /var/task/.next/server/app/page.js:3:1",
      "    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)",
    ].join("\n");
    const frames = parseStack(stack);
    expect(frames).toHaveLength(4);
    expect(frames[3]).toEqual({
      function: "placeOrder",
      filename: "/var/task/.next/server/chunks/123.js",
      lineno: 10,
      colno: 5,
      in_app: true,
    });
    expect(frames[2]?.in_app).toBe(false); // node_modules
    expect(frames[1]?.function).toBeUndefined();
    expect(frames[0]?.in_app).toBe(false); // node:internal
  });
});

describe("buildEvent + buildEnvelope", () => {
  it("builds a scrubbed event without user, IP or query string", () => {
    const err = Object.assign(new Error("Lookup failed for 0771234567"), { digest: "998877" });
    const event = buildEvent(
      scrubError(err),
      {
        level: "error",
        source: "server",
        environment: "production",
        release: "abc1234",
        path: "/track",
        method: "POST",
        tags: { routeType: "action" },
      },
      "a".repeat(32),
      new Date("2026-11-12T00:00:00Z"),
    );
    expect(event).toMatchObject({
      event_id: "a".repeat(32),
      timestamp: 1794441600,
      platform: "node",
      environment: "production",
      release: "abc1234",
      user: { ip_address: null },
      tags: { source: "server", digest: "998877", routeType: "action" },
      transaction: "/track",
      request: { url: "/track", method: "POST" },
    });
    const value = (event.exception as { values: { type: string; value: string }[] }).values[0];
    expect(value).toMatchObject({ type: "Error", value: "Lookup failed for [phone]" });
    expect(JSON.stringify(event)).not.toContain("0771234567");

    const lines = buildEnvelope(event, parseDsn(DSN)!).split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]!)).toMatchObject({ event_id: "a".repeat(32) });
    const item = JSON.parse(lines[1]!) as { type: string; length: number };
    expect(item.type).toBe("event");
    expect(item.length).toBe(new TextEncoder().encode(lines[2]!).length);
    expect(JSON.parse(lines[2]!)).toEqual(event);
  });

  it("makes 32-hex event ids", () => {
    expect(newEventId()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("formatLogLine", () => {
  it("writes one scrubbed JSON object and keeps the error's class name", () => {
    const line = formatLogLine(
      "error",
      "error",
      { source: "server", email: "a@b.lk", error: scrubError(new TypeError("bad input from a@b.lk")) },
      new Date("2026-11-12T00:00:00Z"),
    );
    const parsed = JSON.parse(line) as Record<string, unknown> & { error: { name: string; message: string } };
    expect(parsed).toMatchObject({ level: "error", event: "error", time: "2026-11-12T00:00:00.000Z" });
    expect(parsed.email).toBe("[redacted]");
    expect(parsed.error.name).toBe("TypeError");
    expect(parsed.error.message).toBe("bad input from [email]");
  });
});
