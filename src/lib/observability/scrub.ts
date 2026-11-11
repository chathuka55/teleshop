/**
 * PII / secret scrubbing for everything that leaves the app as a log line or error report
 * (P8-T05, docs/10 §1 "Logging & monitoring"). Pure, so it runs anywhere and is unit tested.
 *
 * Two layers:
 *  - values under sensitive KEYS are dropped whatever they look like (password, token, cookie…);
 *  - free text (error messages, stacks, URLs) has sensitive PATTERNS replaced (emails, phones…).
 * When in doubt, redact: a log that hides a little too much is fine, a leaked address isn't.
 */

export const REDACTED = "[redacted]";

/**
 * Keys whose values are never logged, matched case-insensitively. Not a bare "name": that is also
 * an error's class name — people's names live in the *name keys (firstName, recipientName…).
 */
const SENSITIVE_KEY =
  /pass(word)?|secret|token|cookie|session|authoriz|credential|otp|recovery|(verification|reset|auth|login)code|e-?mail|phone|mobile|address|street|recipient|postcode|zip|(first|last|full|user|display|customer|contact|account)name|^nic$|bank|account(no|number)|card|serial|imei|^ip$|ipaddress|clientip|x-forwarded-for|x-real-ip/i;

const PATTERNS: readonly [RegExp, string][] = [
  // Credentials inside URLs: mongodb+srv://user:pass@host, https://user:pass@host
  [/([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, `$1${REDACTED}@`],
  // Authorization headers / bearer tokens
  [/\b(bearer|basic)\s+[a-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`],
  // JWT / JWE: header.payload.rest (the last part swallows any further dotted parts)
  [/\beyJ[\w-]{5,}\.[\w-]{2,}\.[\w.-]{2,}/g, REDACTED],
  // Secrets in query strings / form-encoded text
  [/([?&;\s](?:token|code|password|secret|key|sig|signature|email|phone)=)[^&\s#]+/gi, `$1${REDACTED}`],
  // Email addresses
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]"],
  // Sri Lankan phone numbers: +94 77 123 4567, 0771234567, 077-123-4567
  [/(?:\+94|\b0)[\s-]?7\d[\s-]?\d{3}[\s-]?\d{4}\b/g, "[phone]"],
  // Long digit runs: IMEIs (15), card / account / NIC numbers (≥ 9 digits)
  [/\b\d{9,19}\b/g, "[number]"],
  // Long hex / base64 blobs that look like keys or hashes (≥ 32 chars)
  [/\b[a-f0-9]{32,}\b/gi, "[hex]"],
];

/** Replaces sensitive patterns inside free text. */
export function scrubText(text: string): string {
  let out = text;
  for (const [re, replacement] of PATTERNS) out = out.replace(re, replacement);
  return out;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

const MAX_DEPTH = 5;
const MAX_STRING = 2000;

/**
 * Deep-copies `value` with sensitive keys dropped and strings scrubbed. Handles cycles, caps
 * depth and string length so a huge object can't flood the logs.
 */
export function scrub(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === "string")
    return scrubText(value.length > MAX_STRING ? value.slice(0, MAX_STRING) + "…" : value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return "[truncated]";
  seen.add(value);
  if (value instanceof Error) return scrubError(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSensitiveKey(k) ? REDACTED : scrub(v, depth + 1, seen);
  }
  return out;
}

export type ScrubbedError = { name: string; message: string; stack?: string; digest?: string };

/** An Error as plain data: name, scrubbed message and stack, Next's digest when present. */
export function scrubError(error: unknown): ScrubbedError {
  if (!(error instanceof Error))
    return { name: "NonError", message: scrubText(String(error)).slice(0, MAX_STRING) };
  const digest = (error as Error & { digest?: unknown }).digest;
  return {
    name: error.name,
    message: scrubText(error.message).slice(0, MAX_STRING),
    ...(error.stack ? { stack: scrubText(error.stack).slice(0, 8000) } : {}),
    ...(typeof digest === "string" ? { digest } : {}),
  };
}

/** A URL reduced to its path: no query string (tokens, emails, search terms) and no fragment. */
export function pathOnly(url: string): string {
  try {
    return new URL(url, "http://x").pathname;
  } catch {
    return url.split(/[?#]/)[0] ?? "";
  }
}
