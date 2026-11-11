import { NextResponse } from "next/server";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { CLIENT_ERROR_MAX_BYTES, clientErrorSchema, toError } from "@/lib/observability/client-error";
import { reportError } from "@/lib/observability/report";

export const dynamic = "force-dynamic";

/**
 * POST /api/client-errors — browser errors from the error pages (P8-T05, docs/09). Anonymous on
 * purpose (an error can happen before sign-in), so: JSON only, ≤ 8 KB, Zod-checked, 10/min per IP,
 * scrubbed before logging. Always answers 204 for an accepted report and never echoes input.
 */
export async function POST(req: Request): Promise<Response> {
  const limited = await rateLimit(`client-errors:${(await clientIp()) ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) return new NextResponse(null, { status: 429 });
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return new NextResponse(null, { status: 415 });
  }

  const text = await req.text();
  if (text.length > CLIENT_ERROR_MAX_BYTES) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = clientErrorSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  await reportError(toError(parsed.data), { source: "client", path: parsed.data.path });
  return new NextResponse(null, { status: 204 });
}
