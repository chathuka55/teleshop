import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "@/config/env";
import { insertAuditLog, type AuditEntry } from "@/db/repositories/audit-log.repository";

/**
 * IP addresses are never stored: only SHA-256(ip + daily salt), where the salt is derived from
 * AUTH_SECRET and today's date — enough to spot a burst from one address, useless to re-identify.
 */
export function hashIp(ip: string | null | undefined, now = new Date()): string | null {
  if (!ip) return null;
  const salt = createHmac("sha256", env.AUTH_SECRET).update(now.toISOString().slice(0, 10)).digest("hex");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export type AuditEvent = Omit<AuditEntry, "ipHash"> & { ip?: string | null };

/**
 * `audit.log(...)` for sensitive actions (RULES.md). Best effort: a failed write is swallowed so
 * it can never block the action it records. Never put passwords, tokens or addresses in `data`.
 */
export const audit = {
  async log({ ip, ...entry }: AuditEvent): Promise<void> {
    try {
      await insertAuditLog({ ...entry, ipHash: hashIp(ip) });
    } catch {
      // Intentionally silent: no PII in logs, and auditing must not break sign-in.
    }
  },
};
