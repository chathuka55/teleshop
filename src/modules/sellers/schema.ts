import { z } from "zod";
import { districts } from "@/config/districts";
import { phoneLKAny } from "@/lib/validation/common";
import { stripControlChars } from "@/modules/reviews/schema";

const text = (max: number) =>
  z.string().trim().max(max, `Keep it under ${max} characters`).transform(stripControlChars);

/** Shop settings (S4). Bank: name, branch and the last 4 digits — never the full account number. */
export const shopSettingsSchema = z
  .object({
    description: text(1000),
    openingHours: text(80),
    phone: phoneLKAny,
    addressLine1: text(120).refine((v) => v.length >= 3, "Enter the shop address"),
    city: text(60).refine((v) => v.length >= 2, "Enter the city"),
    district: z.enum(districts, { message: "Choose a district" }),
    postalCode: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{5}$/.test(v), "Use the 5-digit postal code"),
    tags: z
      .string()
      .trim()
      .transform((v) =>
        v
          .split(",")
          .map((t) => stripControlChars(t.trim()))
          .filter(Boolean),
      )
      .pipe(
        z
          .array(z.string().max(24, "Keep each tag under 24 characters"))
          .max(5, "Up to 5 tags")
          .refine((t) => new Set(t.map((x) => x.toLowerCase())).size === t.length, "Each tag once"),
      ),
    dispatchDays: z.coerce.number().int().min(0).max(14, "Up to 14 days"),
    payoutBank: text(60),
    payoutBranch: text(60),
    payoutLast4: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}$/.test(v), "Only the last 4 digits"),
  })
  .superRefine((d, ctx) => {
    const filled = [d.payoutBank, d.payoutBranch, d.payoutLast4].filter(Boolean).length;
    if (filled > 0 && filled < 3) {
      for (const key of ["payoutBank", "payoutBranch", "payoutLast4"] as const) {
        if (!d[key])
          ctx.addIssue({ code: "custom", path: [key], message: "Fill in all bank details, or none" });
      }
    }
  });
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
