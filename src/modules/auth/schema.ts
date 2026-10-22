import { z } from "zod";
import { districts } from "@/config/districts";
import { email, newPassword, phoneLK, phoneLKAny } from "@/lib/validation/common";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const signInSchema = z.object({
  email,
  // Never reveal password rules on sign-in; just require something.
  password: z.string().min(1, "Enter your password").max(128),
  remember: checkbox.optional(),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email,
    phone: phoneLK,
    password: newPassword,
    confirmPassword: z.string(),
    terms: checkbox.refine((v) => v, "Please accept the Terms and Privacy Policy"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const shopTypes = [
  { value: "mobile_shop", label: "Mobile Shop" },
  { value: "computer_shop", label: "Computer Shop" },
  { value: "accessories_shop", label: "Accessories Shop" },
  { value: "general_tech", label: "General Tech" },
] as const;

/** Seller application (docs/08 `sellers`). Owner account is the signed-in user (P6-T01). */
export const sellerApplicationSchema = z.object({
  shopName: z.string().trim().min(2, "Enter your shop name").max(80),
  shopType: z.enum(["mobile_shop", "computer_shop", "accessories_shop", "general_tech"]),
  businessRegNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,3}\s?\d{3,10}$/, "Use the number on your BR certificate, e.g. PV 00214587"),
  addressLine1: z.string().trim().min(3, "Enter the shop address").max(120),
  city: z.string().trim().min(2, "Enter the city").max(60),
  district: z.enum(districts, { message: "Choose a district" }),
  phone: phoneLKAny,
  agree: checkbox.refine((v) => v, "Please accept the Seller Terms & Fees policy"),
});

export const forgotPasswordSchema = z.object({ email });

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;
