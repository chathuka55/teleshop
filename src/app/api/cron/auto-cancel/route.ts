import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { isCronRequest } from "@/lib/security/cron-auth";
import { autoCancelUnconfirmed } from "@/modules/orders/auto-cancel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/auto-cancel — daily Vercel Cron (vercel.json). Cancels packages no shop accepted
 * within the admin's "auto-cancel after" hours. Only Vercel (holding CRON_SECRET) may call it.
 */
export async function GET(req: Request): Promise<Response> {
  if (!env.CRON_SECRET) return new NextResponse("Cron is not configured", { status: 503 });
  if (!isCronRequest(req.headers.get("authorization"), env.CRON_SECRET)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json(await autoCancelUnconfirmed());
}
