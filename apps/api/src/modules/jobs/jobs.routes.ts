import { Router } from 'express';
import { z } from 'zod';
import { jobIdParamSchema } from '@ytp/validators';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import {
  cancelJobForUser,
  deleteJobForUser,
  getJobForUser,
  listJobsForUser,
  restoreJobForUser,
  toPublicJob,
} from '@/modules/jobs/jobs.service.js';

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  parentJobId: z.string().min(1).optional(),
  trashed: z.coerce.boolean().optional(),
});

jobsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, parentJobId, trashed } = listQuerySchema.parse(req.query);
    const { items, total } = await listJobsForUser(getUserId(req), {
      page,
      pageSize,
      parentJobId,
      trashed,
    });

    res.json({
      success: true,
      data: {
        items: items.map(toPublicJob),
        page: page ?? 1,
        pageSize: pageSize ?? 20,
        total,
        hasMore: (page ?? 1) * (pageSize ?? 20) < total,
      },
    });
  }),
);

jobsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await getJobForUser(id, getUserId(req));
    res.json({ success: true, data: toPublicJob(job) });
  }),
);

jobsRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await cancelJobForUser(id, getUserId(req));
    res.json({ success: true, data: toPublicJob(job) });
  }),
);

jobsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = jobIdParamSchema.parse(req.params);
    await deleteJobForUser(id, getUserId(req));
    res.json({ success: true, data: { deleted: true } });
  }),
);

jobsRouter.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const { id } = jobIdParamSchema.parse(req.params);
    const job = await restoreJobForUser(id, getUserId(req));
    res.json({ success: true, data: toPublicJob(job) });
  }),
);
