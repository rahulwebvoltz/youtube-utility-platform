import type { Job, PaginatedResult } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

export async function listJobs(
  params: {
    page?: number | undefined;
    pageSize?: number | undefined;
    parentJobId?: string | undefined;
    trashed?: boolean | undefined;
  } = {},
): Promise<PaginatedResult<Job>> {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  if (params.parentJobId) search.set('parentJobId', params.parentJobId);
  if (params.trashed) search.set('trashed', 'true');
  const qs = search.toString();

  return apiFetch<PaginatedResult<Job>>(`/api/v1/jobs${qs ? `?${qs}` : ''}`);
}

export async function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}`);
}

export async function cancelJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/cancel`, { method: 'POST' });
}

export async function deleteJob(id: string): Promise<void> {
  await apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' });
}

export async function restoreJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/jobs/${id}/restore`, { method: 'POST' });
}
