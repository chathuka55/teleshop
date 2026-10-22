import "server-only";
import { timingSafeEqual } from "node:crypto";
import { findOrderForTracking } from "@/db/repositories/order.repository";
import type { TrackOrderInput } from "./schema";
import type { TrackResultDTO } from "./types";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Public order lookup (docs/09 GET /track). Returns `null` for "no such order" AND "wrong phone"
 * so the endpoint cannot be used to discover order numbers (phase-5 notes).
 */
export async function trackOrder({ orderNo, phone }: TrackOrderInput): Promise<TrackResultDTO | null> {
  const found = await findOrderForTracking(orderNo);
  if (!found || !safeEqual(found.phone, phone)) return null;
  return found.result;
}
