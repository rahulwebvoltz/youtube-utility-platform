import { AuditLogModel, type AuditLogDocument } from '@/database/models/auditLog.model.js';
import type { UserDocument } from '@/database/models/user.model.js';

type AuditAction =
  'user.role_changed' | 'user.disabled' | 'user.enabled' | 'job.cancelled' | 'job.deleted';

export async function recordAuditLog(
  actor: UserDocument,
  action: AuditAction,
  targetType: 'user' | 'job',
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await AuditLogModel.create({
    actorId: actor._id,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    metadata,
  });
}

export function toPublicAuditLog(log: AuditLogDocument) {
  return {
    id: log._id.toString(),
    actorId: log.actorId.toString(),
    actorEmail: log.actorEmail,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    // Mongoose's Schema.Types.Mixed resolves to `any` - genuinely freeform per action.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
    metadata: log.metadata as Record<string, unknown> | undefined,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function listAuditLogs(
  options: {
    page?: number | undefined;
    pageSize?: number | undefined;
    action?: string | undefined;
  } = {},
): Promise<{ items: AuditLogDocument[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20));
  const filter = options.action ? { action: options.action } : {};

  const [items, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    AuditLogModel.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
}
