import { z } from "zod";
import { phoneLK } from "@/lib/validation/common";

export const contactTopics = ["order", "returns", "selling", "other"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  phone: z.union([z.literal(""), phoneLK]).optional(),
  topic: z.enum(contactTopics),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
