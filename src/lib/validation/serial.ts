import { z } from "zod";

/** Luhn check digit (IMEI's last digit). */
export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * IMEI or serial number (phase-6 notes): spaces and dashes dropped, upper-cased; 15 digits must
 * pass the IMEI Luhn check; anything else must be 6–30 letters/digits.
 */
export const serialNumber = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
  .pipe(
    z
      .string()
      .min(1, "Enter the IMEI or serial number")
      .regex(/^[A-Z0-9]{6,30}$/, "Use 6–30 letters and digits (an IMEI is 15 digits)")
      .refine(
        (v) => !/^\d{15}$/.test(v) || luhnValid(v),
        "That IMEI's last digit doesn't match — check all 15 digits",
      ),
  );
