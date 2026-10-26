import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Single-use tokens for email links (verification, password reset). The raw token only ever
 * appears in the email; the database keeps its SHA-256 (docs/08 `verification_tokens`,
 * `password_resets`), so a database leak can't be turned into working links.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/** Shape check before touching the database: 32 random bytes in base64url = 43 chars. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
