import { z } from "zod";
import { districts } from "@/config/districts";
import { phoneLK } from "@/lib/validation/common";

/** Address form (account + checkout). The owner always comes from the session, never the form. */
export const addressSchema = z.object({
  label: z.enum(["home", "office", "other"]).catch("home"),
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: phoneLK,
  line1: z.string().trim().min(3, "Enter the house number and street").max(120),
  line2: z.string().trim().max(120).catch(""),
  city: z.string().trim().min(2, "Enter the city").max(60),
  district: z.enum(districts, { message: "Choose a district" }),
  postalCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}$/.test(v), "Postal codes have 5 digits")
    .transform((v) => (v === "" ? null : v)),
  makeDefault: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export type AddressFormInput = z.infer<typeof addressSchema>;
