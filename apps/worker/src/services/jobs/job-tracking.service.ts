import { JobModel, type JobDocument } from '@ytp/db';
import type { JobSocketEvent } from '@ytp/types';
import { emitJobEvent } from '@/realtime/emitter.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

function notify(job: JobDocument, event: JobSocketEvent): void {
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

/** Loads the job unless it's already in a terminal state (e.g. user-cancelled) - callers should no-op in that case. */
async function loadIfActive(jobId: string): Promise<JobDocument | null> {
  const job = await JobModel.findById(jobId);
  if (!job || TERMINAL_STATUSES.has(job.status)) return null;
  return job;
}

export async function markJobStarted(jobId: string): Promise<void> {
  const job = await loadIfActive(jobId);
  if (!job) return;

  job.status = 'started';
  job.startedAt = new Date();
  await job.save();
  notify(job, 'job:started');
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  stage: string,
): Promise<void> {
  const job = await loadIfActive(jobId);
  if (!job) return;

  job.status = 'processing';
  job.progress = progress;
  job.stage = stage;
  await job.save();
  notify(job, 'job:progress');
}

export async function markJobCompleted(jobId: string, result: unknown): Promise<void> {
  const job = await loadIfActive(jobId);
  if (!job) return;

  job.status = 'completed';
  job.progress = 100;
  job.result = result;
  job.completedAt = new Date();
  await job.save();
  notify(job, 'job:completed');
}

export async function markJobFailed(jobId: string, error: string): Promise<void> {
  const job = await loadIfActive(jobId);
  if (!job) return;

  job.status = 'failed';
  job.error = error;
  job.completedAt = new Date();
  await job.save();
  notify(job, 'job:failed');
}
