import { JobModel, type JobDocument } from '@ytp/db';
import type { JobType } from '@ytp/types';
import { ApiError } from '@/middleware/errorHandler.js';
import { emitJobEvent } from '@/websocket/io.js';
import { queues } from '@/queues/queues.js';
import { recordAuditLog } from '@/modules/admin/audit.service.js';
import type { UserDocument } from '@/database/models/user.model.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export async function listAllJobs(
  options: {
    page?: number | undefined;
    pageSize?: number | undefined;
    type?: JobType | undefined;
    status?: string | undefined;
    userId?: string | undefined;
  } = {},
): Promise<{ items: JobDocument[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? 20));
  const filter = {
    ...(options.type ? { type: options.type } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(options.userId ? { userId: options.userId } : {}),
  };

  const [items, total] = await Promise.all([
    JobModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    JobModel.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
}

async function findJobOr404(jobId: string): Promise<JobDocument> {
  const job = await JobModel.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'NOT_FOUND', 'Job not found');
  }
  return job;
}

export async function adminCancelJob(actor: UserDocument, jobId: string): Promise<JobDocument> {
  const job = await findJobOr404(jobId);

  if (TERMINAL_STATUSES.has(job.status)) {
    throw new ApiError(409, 'JOB_NOT_CANCELLABLE', 'This job can no longer be cancelled');
  }

  const queue = queues[job.type];
  const bullJob = await queue.getJob(job._id.toString());
  if (bullJob) {
    const state = await bullJob.getState();
    if (state === 'waiting' || state === 'delayed') {
      await bullJob.remove();
    }
  }

  job.status = 'cancelled';
  job.completedAt = new Date();
  await job.save();

  emitJobEvent(job.userId.toString(), 'job:cancelled', {
    jobId: job._id.toString(),
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage ?? undefined,
  });

  await recordAuditLog(actor, 'job.cancelled', 'job', jobId, {
    type: job.type,
    userId: job.userId.toString(),
  });
  return job;
}

export async function adminDeleteJob(actor: UserDocument, jobId: string): Promise<void> {
  const job = await findJobOr404(jobId);
  job.deletedAt = new Date();
  await job.save();

  await recordAuditLog(actor, 'job.deleted', 'job', jobId, {
    type: job.type,
    userId: job.userId.toString(),
  });
}
