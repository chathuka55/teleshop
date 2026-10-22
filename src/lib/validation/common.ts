import { z } from "zod";

/**
 * Sri Lankan mobile number → E.164 `+947XXXXXXXX`.
 * Accepts `0771234567`, `077 123 4567`, `+94 77 123 4567`, `94771234567`.
 */
export const phoneLK = z
  .string()
  .trim()
  .max(20)
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => /^(?:\+94|94|0)?7\d{8}$/.test(s), {
    message: "Enter a Sri Lankan mobile number, e.g. 077 123 4567",
  })
  .transform((s) => `+94${s.slice(-9)}`);

/** Any Sri Lankan number (mobile or landline, e.g. shop phones `081 222 3344`) → `+94XXXXXXXXX`. */
export const phoneLKAny = z
  .string()
  .trim()
  .max(20)
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => /^(?:\+94|94|0)?[1-9]\d{8}$/.test(s), {
    message: "Enter a Sri Lankan phone number, e.g. 081 222 3344",
  })
  .transform((s) => `+94${s.slice(-9)}`);

export const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

/** docs/10: minimum 10 characters. The breached-password check is added in P2-T02. */
export const newPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

/** `TS-2026-000123` (case-insensitive input). */
export const orderNo = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TS-\d{4}-\d{6}$/, "Order numbers look like TS-2026-000123");

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
