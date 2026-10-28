import type { ZodError } from "zod";

/** First message per full path ("variants.0.price", "specs.storage", "name") for nested forms. */
export function fieldPathErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
