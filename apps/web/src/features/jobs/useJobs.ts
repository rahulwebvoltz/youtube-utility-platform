import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JobStatus } from '@ytp/types';
import { useAuthStore } from '@/stores/auth-store.js';
import { cancelJob, deleteJob, getJob, listJobs, restoreJob } from '@/features/jobs/jobs.api.js';

export const JOBS_QUERY_KEY = ['jobs'] as const;
const TRASHED_JOBS_QUERY_KEY = ['jobs', 'trashed'] as const;

const ACTIVE_STATUSES = new Set<JobStatus>(['queued', 'started', 'processing', 'uploading']);

/** Polls a single job while it's active; stops once it reaches a terminal status. */
export function useJobQuery(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => {
      if (!jobId) throw new Error('Missing job id');
      return getJob(jobId);
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.has(status) ? 1000 : false;
    },
    // The socket pushes updates instantly while this tab is focused; this poll
    // is the fallback for a dropped socket connection or a backgrounded tab,
    // where React Query would otherwise pause polling entirely by default.
    refetchIntervalInBackground: true,
  });
}

/**
 * Lists a playlist batch job's fanned-out per-video jobs. Keeps polling while
 * the parent is still fanning out (`parentActive`) or any child fetched so far
 * is still active - the caller passes the parent's own status so this hook
 * doesn't need to duplicate that fetch.
 */
export function useChildJobsQuery(parentJobId: string | undefined, parentActive: boolean) {
  return useQuery({
    queryKey: ['jobs', 'children', parentJobId],
    queryFn: () => listJobs({ parentJobId, pageSize: 500 }),
    enabled: Boolean(parentJobId),
    refetchInterval: (query) => {
      if (parentActive) return 2000;
      const items = query.state.data?.items ?? [];
      return items.some((job) => ACTIVE_STATUSES.has(job.status)) ? 2000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useJobsQuery(pageSize = 20, trashed = false) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: trashed ? TRASHED_JOBS_QUERY_KEY : JOBS_QUERY_KEY,
    queryFn: () => listJobs({ pageSize, trashed }),
    enabled: status === 'authenticated',
  });
}

export function useCancelJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
    },
  });
}

function invalidateJobLists(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: TRASHED_JOBS_QUERY_KEY });
}

export function useDeleteJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      invalidateJobLists(queryClient);
    },
  });
}

export function useRestoreJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreJob,
    onSuccess: () => {
      invalidateJobLists(queryClient);
    },
  });
}
