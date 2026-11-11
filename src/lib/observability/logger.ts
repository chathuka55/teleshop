import { scrub } from "./scrub";

/**
 * Structured server logs (P8-T05): one JSON object per line, so Vercel's log search and alerts can
 * filter on `event` (e.g. count `auth.login_failed` per minute — docs/10 §1). Every field goes
 * through `scrub()`: no emails, phones, addresses, tokens or IPs, whatever a caller passes in.
 * Edge-safe (no Node APIs, no env), so middleware and instrumentation can use it too.
 */

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export function formatLogLine(level: LogLevel, event: string, fields?: LogFields, now = new Date()): string {
  const data = fields ? (scrub(fields) as LogFields) : {};
  return JSON.stringify({ level, event, time: now.toISOString(), ...data });
}

function write(level: LogLevel, event: string, fields?: LogFields): void {
  const line = formatLogLine(level, event, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields?: LogFields): void => write("info", event, fields),
  warn: (event: string, fields?: LogFields): void => write("warn", event, fields),
  error: (event: string, fields?: LogFields): void => write("error", event, fields),
};
