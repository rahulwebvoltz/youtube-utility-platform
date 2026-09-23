import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const AUDIT_ACTIONS = [
  'user.role_changed',
  'user.disabled',
  'user.enabled',
  'job.cancelled',
  'job.deleted',
] as const;

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetType: { type: String, enum: ['user', 'job'], required: true },
    targetId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AuditLogDocument = HydratedDocument<InferSchemaType<typeof auditLogSchema>>;

export const AuditLogModel = model('AuditLog', auditLogSchema);
