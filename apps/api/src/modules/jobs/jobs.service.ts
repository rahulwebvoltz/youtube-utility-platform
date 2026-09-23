import { JobModel, type JobDocument } from '@ytp/db';
import type { JobSocketEvent, JobSource, JobType } from '@ytp/types';
import { ApiError } from '@/middleware/errorHandler.js';
import { emitJobEvent } from '@/websocket/io.js';
import { queues } from '@/queues/queues.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function toPublicJob(job: JobDocument) {
  return {
    id: job._id.toString(),
    userId: job.userId.toString(),
    parentJobId: job.parentJobId?.toString(),
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    source: job.source,
    // Mongoose's Schema.Types.Mixed resolves to `any` - these fields are
    // genuinely freeform (their shape depends on the job's type), so widen to
    // `unknown`-flavored records rather than propagating `any` to callers.
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- see comment above */
    options: job.options as Record<string, unknown>,
    result: job.result as Record<string, unknown> | undefined,
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    deletedAt: job.deletedAt?.toISOString(),
  };
}

function notifyJobEvent(job: JobDocument, event: JobSocketEvent): void {
  emitJobEvent(job.userId.toString(), event, {
    jobId: job._id.toString(),
    type: job.type,
    status: job.status,
    progress: job.progress,
    stage: job.stage ?? undefined,
    result: job.result,
    error: job.error ?? undefined,
  });
}

export async function createJob(params: {
  userId: string;
  type: JobType;
  source: JobSource;
  options?: Record<string, unknown>;
}): Promise<JobDocument> {
  const job = await JobModel.create({
    userId: params.userId,
    type: params.type,
    source: params.source,
    options: params.options ?? {},
    status: 'queued',
    progress: 0,
  });

  notifyJobEvent(job, 'job:created');
  return job;
}

export async function listJobsForUser(
  userId: string,
  options: {
    page?: number | undefined;
    pageSize?: number | undefined;
    parentJobId?: string | undefined;
    trashed?: boolean | undefined;
  } = {},
): Promise<{ items: JobDocument[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? 20));
  const filter = {
    userId,
    ...(options.parentJobId ? { parentJobId: options.parentJobId } : {}),
    deletedAt: options.trashed ? { $ne: null } : null,
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

export async function getJobForUser(jobId: string, userId: string): Promise<JobDocument> {
  const job = await JobModel.findOne({ _id: jobId, userId });
  if (!job) {
    throw new ApiError(404, 'NOT_FOUND', 'Job not found');
  }
  return job;
}

export async function cancelJobForUser(jobId: string, userId: string): Promise<JobDocument> {
  const job = await getJobForUser(jobId, userId);

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
    // An already-active job is left to run; its own completion/failure handler
    // will see status is already "cancelled" and won't overwrite it (see the
    // worker's job-tracking guard).
  }

  job.status = 'cancelled';
  job.completedAt = new Date();
  await job.save();

  notifyJobEvent(job, 'job:cancelled');
  return job;
}

/** Soft delete - hides a job from history, reversibly (see restoreJobForUser). */
export async function deleteJobForUser(jobId: string, userId: string): Promise<void> {
  const job = await getJobForUser(jobId, userId);
  job.deletedAt = new Date();
  await job.save();
}

export async function restoreJobForUser(jobId: string, userId: string): Promise<JobDocument> {
  const job = await JobModel.findOne({ _id: jobId, userId, deletedAt: { $ne: null } });
  if (!job) {
    throw new ApiError(404, 'NOT_FOUND', 'Deleted job not found');
  }
  job.deletedAt = null;
  await job.save();
  return job;
}
