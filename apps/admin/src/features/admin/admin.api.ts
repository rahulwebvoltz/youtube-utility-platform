import type { Job, JobType, User } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueLength: number;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/v1/admin/dashboard');
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function listUsers(
  params: { page?: number | undefined; search?: string | undefined } = {},
): Promise<Paginated<User>> {
  return apiFetch<Paginated<User>>(`/api/v1/admin/users${toQueryString(params)}`);
}

export interface UserDetail {
  user: User;
  stats: { totalJobs: number; totalMediaFiles: number; totalStorageBytes: number };
}

export function getUserDetail(id: string): Promise<UserDetail> {
  return apiFetch<UserDetail>(`/api/v1/admin/users/${id}`);
}

export function updateUserRole(id: string, role: User['role']): Promise<User> {
  return apiFetch<User>(`/api/v1/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function setUserDisabled(id: string, disabled: boolean): Promise<User> {
  return apiFetch<User>(`/api/v1/admin/users/${id}/${disabled ? 'disable' : 'enable'}`, {
    method: 'POST',
  });
}

export function listJobs(
  params: {
    page?: number | undefined;
    pageSize?: number | undefined;
    type?: JobType | undefined;
    status?: string | undefined;
    userId?: string | undefined;
  } = {},
): Promise<Paginated<Job>> {
  return apiFetch<Paginated<Job>>(`/api/v1/admin/jobs${toQueryString(params)}`);
}

export function adminCancelJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/v1/admin/jobs/${id}/cancel`, { method: 'POST' });
}

export function adminDeleteJob(id: string): Promise<{ deleted: boolean }> {
  return apiFetch(`/api/v1/admin/jobs/${id}`, { method: 'DELETE' });
}

export interface QueueStat {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
}

export function listQueues(): Promise<QueueStat[]> {
  return apiFetch<QueueStat[]>('/api/v1/admin/queues');
}

export interface WorkerHeartbeat {
  instanceId: string;
  hostname: string;
  pid: number;
  queues: string[];
  startedAt: string;
  lastSeenAt: string;
}

export function listWorkers(): Promise<WorkerHeartbeat[]> {
  return apiFetch<WorkerHeartbeat[]>('/api/v1/admin/workers');
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  byType: { type: string; count: number; bytes: number }[];
  topUsers: { userId: string; email: string; count: number; bytes: number }[];
}

export function getStorageStats(): Promise<StorageStats> {
  return apiFetch<StorageStats>('/api/v1/admin/storage');
}

export interface SystemHealth {
  api: { uptimeSeconds: number; nodeVersion: string };
  mongo: { connected: boolean };
  redis: { connected: boolean };
}

export function getSystemHealth(): Promise<SystemHealth> {
  return apiFetch<SystemHealth>('/api/v1/admin/system');
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function listAuditLogs(
  params: { page?: number | undefined; action?: string | undefined } = {},
): Promise<Paginated<AuditLogEntry>> {
  return apiFetch<Paginated<AuditLogEntry>>(`/api/v1/admin/audit-logs${toQueryString(params)}`);
}
