import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Job, JobEventPayload, JobSocketEvent, PaginatedResult } from '@ytp/types';
import { connectSocket, disconnectSocket } from '@/lib/socket.js';
import { JOBS_QUERY_KEY } from '@/features/jobs/useJobs.js';
import { useAuthStore } from '@/stores/auth-store.js';

const JOB_EVENTS: JobSocketEvent[] = [
  'job:created',
  'job:started',
  'job:stage',
  'job:progress',
  'job:completed',
  'job:failed',
  'job:cancelled',
];

function patchJob(job: Job, payload: JobEventPayload): Job {
  return {
    ...job,
    status: payload.status,
    progress: payload.progress,
    stage: payload.stage,
    // JobEventPayload.result is deliberately `unknown` - its real shape
    // depends on the job's type, same as Job<TResult>'s own generic default.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
    result: (payload.result as Job['result']) ?? job.result,
    error: payload.error,
  };
}

function applyJobEvent(
  queryClient: QueryClient,
  event: JobSocketEvent,
  payload: JobEventPayload,
): void {
  // Single-job pages (Transcript/Media/PlaylistBatch progress views) poll this
  // exact key - patch it directly so they update the instant the event
  // arrives, instead of waiting for their next poll (which pauses entirely
  // while the browser tab isn't focused).
  queryClient.setQueryData<Job>(['job', payload.jobId], (old) =>
    old ? patchJob(old, payload) : old,
  );

  const current = queryClient.getQueryData<PaginatedResult<Job>>(JOBS_QUERY_KEY);
  const isCached = current?.items.some((job) => job.id === payload.jobId) ?? false;

  if (!isCached) {
    // Not in the cached first page yet (typically a fresh job:created) - refetch
    // to pick it up rather than trying to guess its place in the sorted list.
    if (event === 'job:created') {
      void queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
    }
    return;
  }

  queryClient.setQueryData<PaginatedResult<Job>>(JOBS_QUERY_KEY, (old) => {
    if (!old) return old;
    return {
      ...old,
      items: old.items.map((job) => (job.id === payload.jobId ? patchJob(job, payload) : job)),
    };
  });
}

/** Mount once near the app root - bridges live job events into the jobs query cache. */
export function useJobSocket(): void {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    const handler = (event: JobSocketEvent) => (payload: JobEventPayload) => {
      applyJobEvent(queryClient, event, payload);
    };

    const bound = JOB_EVENTS.map((event) => [event, handler(event)] as const);
    bound.forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      bound.forEach(([event, fn]) => socket.off(event, fn));
    };
  }, [status, queryClient]);
}
