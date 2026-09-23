import { Badge, type BadgeVariant } from '@ytp/ui';
import type { JobStatus } from '@ytp/types';

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: BadgeVariant }> = {
  queued: { label: 'Queued', variant: 'neutral' },
  started: { label: 'Started', variant: 'brand' },
  processing: { label: 'Processing', variant: 'brand' },
  uploading: { label: 'Uploading', variant: 'brand' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
