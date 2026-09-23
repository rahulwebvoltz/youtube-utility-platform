import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Job, JobType } from '@ytp/types';
import { Badge, Button, Card, useToast } from '@ytp/ui';
import { adminCancelJob, adminDeleteJob, listJobs } from '@/features/admin/admin.api.js';
import { useAuthStore } from '@/stores/auth-store.js';
import type { ApiClientError } from '@/lib/api-client.js';

const PAGE_SIZE = 20;
const JOB_TYPES: JobType[] = ['metadata', 'transcript', 'audio', 'video', 'playlist', 'export'];

function isJobType(value: string): value is JobType {
  return (JOB_TYPES as string[]).includes(value);
}
const JOB_STATUSES = [
  'queued',
  'started',
  'processing',
  'uploading',
  'completed',
  'failed',
  'cancelled',
];
const ACTIVE_STATUSES = new Set(['queued', 'started', 'processing', 'uploading']);

const STATUS_VARIANT: Record<string, 'neutral' | 'success' | 'danger' | 'warning' | 'brand'> = {
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  queued: 'warning',
  started: 'brand',
  processing: 'brand',
  uploading: 'brand',
};

export function JobsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<JobType | ''>('');
  const [status, setStatus] = useState('');
  const { show } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'jobs', { page, type, status }],
    queryFn: () =>
      listJobs({ page, pageSize: PAGE_SIZE, type: type || undefined, status: status || undefined }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });

  const cancelMutation = useMutation<Job, ApiClientError, string>({
    mutationFn: adminCancelJob,
    onSuccess: () => {
      show({ title: 'Job cancelled', variant: 'success' });
      invalidate();
    },
    onError: (err) => {
      show({ title: 'Could not cancel job', description: err.message, variant: 'error' });
    },
  });

  const deleteMutation = useMutation<{ deleted: boolean }, ApiClientError, string>({
    mutationFn: adminDeleteJob,
    onSuccess: () => {
      show({ title: 'Job removed', variant: 'success' });
      invalidate();
    },
    onError: (err) => {
      show({ title: 'Could not remove job', description: err.message, variant: 'error' });
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Jobs</h1>
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => {
              const value = e.target.value;
              setType(isJobType(value) ? value : '');
              setPage(1);
            }}
            className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
          >
            <option value="">All types</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="divide-y divide-zinc-100">
        {isLoading && <p className="p-4 text-sm text-zinc-500">Loading...</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="p-4 text-sm text-zinc-500">No jobs found.</p>
        )}
        {data?.items.map((job) => {
          const isActive = ACTIVE_STATUSES.has(job.status);
          return (
            <div key={job.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">
                  {job.type} &middot;{' '}
                  <span className="font-mono text-xs text-zinc-400">{job.id}</span>
                </p>
                <p className="truncate text-xs text-zinc-500">
                  user {job.userId} &middot; {new Date(job.createdAt).toLocaleString()}
                </p>
                {job.error && <p className="mt-0.5 truncate text-xs text-red-600">{job.error}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={STATUS_VARIANT[job.status] ?? 'neutral'}>{job.status}</Badge>
                {isAdmin && isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      cancelMutation.mutate(job.id);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {isAdmin && !isActive && !job.deletedAt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm("Remove this job from the user's history?"))
                        deleteMutation.mutate(job.id);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} &middot; {data.total} jobs
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
              }}
            >
              Previous
            </button>
            <button
              className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
