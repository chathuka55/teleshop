import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Append-only (docs/08 §3.1). Never store passwords, tokens or full addresses in `data`. */
const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, enum: ["customer", "seller", "admin", "system"], required: true },
    action: { type: String, required: true, maxlength: 80 },
    entity: { type: String, required: true, maxlength: 40 },
    entityId: { type: String, required: true, maxlength: 64 },
    data: { type: Schema.Types.Mixed, default: {} },
    /** SHA-256 of IP + daily salt */
    ipHash: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: "throw" },
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel =
  (models.AuditLog as Model<AuditLogDoc> | undefined) ??
  model<AuditLogDoc>("AuditLog", auditLogSchema, "audit_logs");
