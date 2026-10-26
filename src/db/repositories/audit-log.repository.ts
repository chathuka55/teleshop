import { connectDB } from "../mongoose";
import { AuditLogModel } from "../models/audit-log.model";

export type AuditEntry = {
  actorId: string | null;
  actorRole: "customer" | "seller" | "admin" | "system";
  action: string;
  entity: string;
  entityId: string;
  data?: Record<string, unknown>;
  ipHash?: string | null;
};

/** Append-only — there is deliberately no update or delete here (docs/08 §3.1). */
export async function insertAuditLog(entry: AuditEntry): Promise<void> {
  await connectDB();
  await AuditLogModel.create({ ...entry, data: entry.data ?? {}, ipHash: entry.ipHash ?? null });
}
