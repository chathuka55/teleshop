import type { ZodError } from "zod";

/** Result shape every form Server Action returns (rendered by `useActionState`). */
export type FormState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; fields?: Record<string, string>; values?: Record<string, string> };

export const idleState: FormState = { status: "idle" };

/** First message per top-level field — what the form shows under each input. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Text values to re-fill after React resets the form. Secrets (passwords) are never echoed back. */
export function echoValues(formData: FormData, omit: readonly string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v !== "string" || /password/i.test(k) || omit.includes(k) || k.startsWith("$")) continue;
    out[k] = v.slice(0, 2000);
  }
  return out;
}

export function invalid(error: ZodError, values?: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fields: fieldErrors(error),
    values,
  };
}
