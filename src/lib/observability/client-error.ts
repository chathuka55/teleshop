import { z } from "zod";

/**
 * Body of `POST /api/client-errors` (P8-T05): a browser-side error the server never saw — the
 * error pages send it when React caught an error without a server `digest`. Small, bounded
 * strings only; everything is scrubbed again before it is logged or reported.
 */
export const clientErrorSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Error"),
  message: z.string().trim().max(500),
  stack: z.string().max(4000).optional(),
  path: z
    .string()
    .max(300)
    .regex(/^\/[^\s]*$/, "path must be a site path"),
});

export type ClientError = z.infer<typeof clientErrorSchema>;

/** Hard cap on the request body, checked before parsing. */
export const CLIENT_ERROR_MAX_BYTES = 8 * 1024;

/** The parsed report as an Error, so it goes through the same scrubbing as server errors. */
export function toError(report: ClientError): Error {
  const err = new Error(report.message);
  err.name = report.name;
  err.stack = report.stack ? `${report.name}: ${report.message}\n${report.stack}` : undefined;
  return err;
}
