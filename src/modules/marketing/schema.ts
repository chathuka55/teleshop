import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
