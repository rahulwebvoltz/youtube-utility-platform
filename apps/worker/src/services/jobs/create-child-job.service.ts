import { JobModel, type JobDocument } from '@ytp/db';
import type { JobSource, JobType } from '@ytp/types';
import { emitJobEvent } from '@/realtime/emitter.js';

/**
 * Creates a Job owned by a playlist batch (JobModel.parentJobId set), emitting
 * the same "job:created" event the API emits for top-level jobs so the
 * frontend's job list picks up each fanned-out child in real time too.
 */
export async function createChildJob(params: {
  userId: string;
  parentJobId: string;
  type: JobType;
  source: JobSource;
  options?: Record<string, unknown>;
}): Promise<JobDocument> {
  const job = await JobModel.create({
    userId: params.userId,
    parentJobId: params.parentJobId,
    type: params.type,
    source: params.source,
    options: params.options ?? {},
    status: 'queued',
    progress: 0,
  });

  emitJobEvent(params.userId, 'job:created', {
    jobId: job._id.toString(),
    type: job.type,
    status: job.status,
    progress: job.progress,
  });

  return job;
}
