import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { env } from "@/config/env";
import { hashToken } from "./tokens";

/**
 * Admin TOTP 2FA (P2-T05, docs/10 §1). RFC 6238: 6 digits, 30 s steps, SHA-1 — what Google
 * Authenticator / Authy / 1Password expect. The secret is stored AES-256-GCM encrypted with
 * TOTP_ENCRYPTION_KEY; recovery codes are stored as SHA-256 only.
 */

const ISSUER = "Teleshop";
/** Accept the previous/next 30 s step too (phone clocks drift). */
const TOLERANCE_S = 30;

function key(): Buffer {
  return Buffer.from(env.TOTP_ENCRYPTION_KEY, "base64");
}

/** "v1.<iv>.<tag>.<ciphertext>" (base64url parts). */
export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ct]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptSecret(blob: string): string {
  const [version, iv, tag, ct] = blob.split(".");
  if (version !== "v1" || !iv || !tag || !ct) throw new Error("Unknown TOTP secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

export function newTotpSecret(): string {
  return generateSecret();
}

/** Base32 secret in groups of 4 for typing into an app by hand. */
export function formatManualKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

/** otpauth:// QR code as an SVG data URI (img-src allows data:, no inline HTML needed). */
export async function qrDataUri(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  const svg = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Checks a 6-digit code. `lastStep` is the step of the last accepted code: a code from the same or
 * an older step is refused, so a code seen over someone's shoulder can't be replayed.
 */
export async function checkTotp(
  secret: string,
  code: string,
  lastStep: number,
  epoch?: number,
): Promise<{ ok: true; step: number } | { ok: false }> {
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const r = await verify({
    secret,
    token: code,
    epochTolerance: TOLERANCE_S,
    ...(lastStep > 0 ? { afterTimeStep: lastStep } : {}),
    ...(epoch !== undefined ? { epoch } : {}),
  });
  return r.valid && "timeStep" in r && typeof r.timeStep === "number"
    ? { ok: true, step: r.timeStep }
    : { ok: false };
}

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** 10 single-use recovery codes like "K7QD-M2XP" (40 bits each), shown once. */
export function newRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: count }, () => {
    const bytes = randomBytes(8);
    const chars = [...bytes].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

/** Case- and dash-insensitive, so "k7qdm2xp" matches "K7QD-M2XP". */
export function hashRecoveryCode(code: string): string {
  return hashToken(code.toUpperCase().replace(/[^A-Z0-9]/g, ""));
}
