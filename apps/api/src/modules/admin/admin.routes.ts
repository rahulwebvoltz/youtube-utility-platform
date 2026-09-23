import { Router } from 'express';
import { z } from 'zod';
import { jobTypeSchema } from '@ytp/validators';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth, requireRole } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { UserModel, type UserDocument } from '@/database/models/user.model.js';
import { toPublicUser } from '@/modules/auth/auth.service.js';
import { toPublicJob } from '@/modules/jobs/jobs.service.js';
import { listAuditLogs, toPublicAuditLog } from '@/modules/admin/audit.service.js';
import {
  getUserDetail,
  listUsers,
  setUserDisabled,
  updateUserRole,
} from '@/modules/admin/users.service.js';
import { adminCancelJob, adminDeleteJob, listAllJobs } from '@/modules/admin/jobs.service.js';
import {
  getDashboardStats,
  getQueueStats,
  getStorageStats,
  getSystemHealth,
  getWorkerHeartbeats,
} from '@/modules/admin/monitoring.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin', 'support'));

async function requireActor(userId: string): Promise<UserDocument> {
  const actor = await UserModel.findById(userId);
  if (!actor) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid session');
  }
  return actor;
}

const idParamSchema = z.object({ id: z.string().min(1) });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().min(1).optional(),
});

adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getDashboardStats() });
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, pageSize, search } = listQuerySchema.parse(req.query);
    const { items, total } = await listUsers({ page, pageSize, search });
    res.json({
      success: true,
      data: { items: items.map(toPublicUser), page: page ?? 1, pageSize: pageSize ?? 20, total },
    });
  }),
);

adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { user, stats } = await getUserDetail(id);
    res.json({ success: true, data: { user: toPublicUser(user), stats } });
  }),
);

const roleUpdateSchema = z.object({ role: z.enum(['user', 'admin', 'support']) });

adminRouter.patch(
  '/users/:id/role',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { role } = roleUpdateSchema.parse(req.body);
    const actor = await requireActor(getUserId(req));
    const user = await updateUserRole(actor, id, role);
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

adminRouter.post(
  '/users/:id/disable',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const actor = await requireActor(getUserId(req));
    const user = await setUserDisabled(actor, id, true);
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

adminRouter.post(
  '/users/:id/enable',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const actor = await requireActor(getUserId(req));
    const user = await setUserDisabled(actor, id, false);
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

const jobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  type: jobTypeSchema.optional(),
  status: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

adminRouter.get(
  '/jobs',
  asyncHandler(async (req, res) => {
    const { page, pageSize, type, status, userId } = jobsQuerySchema.parse(req.query);
    const { items, total } = await listAllJobs({ page, pageSize, type, status, userId });
    res.json({
      success: true,
      data: { items: items.map(toPublicJob), page: page ?? 1, pageSize: pageSize ?? 20, total },
    });
  }),
);

adminRouter.post(
  '/jobs/:id/cancel',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const actor = await requireActor(getUserId(req));
    const job = await adminCancelJob(actor, id);
    res.json({ success: true, data: toPublicJob(job) });
  }),
);

adminRouter.delete(
  '/jobs/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const actor = await requireActor(getUserId(req));
    await adminDeleteJob(actor, id);
    res.json({ success: true, data: { deleted: true } });
  }),
);

adminRouter.get(
  '/queues',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getQueueStats() });
  }),
);

adminRouter.get(
  '/workers',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getWorkerHeartbeats() });
  }),
);

adminRouter.get(
  '/storage',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getStorageStats() });
  }),
);

adminRouter.get(
  '/system',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getSystemHealth() });
  }),
);

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  action: z.string().min(1).optional(),
});

adminRouter.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const { page, pageSize, action } = auditQuerySchema.parse(req.query);
    const { items, total } = await listAuditLogs({ page, pageSize, action });
    res.json({
      success: true,
      data: {
        items: items.map(toPublicAuditLog),
        page: page ?? 1,
        pageSize: pageSize ?? 20,
        total,
      },
    });
  }),
);
