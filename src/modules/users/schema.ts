import { z } from "zod";
import { newPassword, phoneLK } from "@/lib/validation/common";

/** Profile form on /account. Email changes are not offered yet (they need re-verification). */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.union([z.literal(""), phoneLK]).transform((v) => (v === "" ? null : v)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((d) => d.password !== d.currentPassword, {
    path: ["password"],
    message: "Choose a password different from the current one",
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
