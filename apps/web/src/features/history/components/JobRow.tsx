import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  ListVideo,
  Music,
  RotateCcw,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import type { Job, JobType } from '@ytp/types';
import { Button, Card } from '@ytp/ui';
import { JobStatusBadge } from '@/features/history/components/JobStatusBadge.js';
import { jobTitle } from '@/features/jobs/jobTitle.js';

const TYPE_ICONS: Record<JobType, typeof Search> = {
  metadata: Search,
  transcript: FileText,
  audio: Music,
  video: Video,
  playlist: ListVideo,
  export: Download,
};

const TYPE_LABELS: Record<JobType, string> = {
  metadata: 'Analysis',
  transcript: 'Transcript',
  audio: 'Audio',
  video: 'Video',
  playlist: 'Playlist',
  export: 'Export',
};

const ACTIVE_STATUSES = new Set(['queued', 'started', 'processing', 'uploading']);

interface JobRowProps {
  job: Job;
  onCancel?: ((id: string) => void) | undefined;
  isCancelling?: boolean | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onRestore?: ((id: string) => void) | undefined;
  isMutating?: boolean | undefined;
}

export function JobRow({
  job,
  onCancel,
  isCancelling = false,
  onDelete,
  onRestore,
  isMutating = false,
}: JobRowProps) {
  const Icon = TYPE_ICONS[job.type];
  const isActive = ACTIVE_STATUSES.has(job.status);
  const isCancellable = isActive && Boolean(onCancel);
  const isTrashed = Boolean(job.deletedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">{jobTitle(job)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
            <span>{TYPE_LABELS[job.type]}</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>{new Date(job.createdAt).toLocaleString()}</span>
          </div>
          {isActive && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${job.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          {isActive && (Boolean(job.stage) || job.progress > 0) && (
            <p className="mt-1 text-xs text-zinc-400">
              {job.stage}
              {job.stage ? ' · ' : ''}
              {job.progress}%
            </p>
          )}
          {job.status === 'failed' && job.error && (
            <p className="mt-1 text-xs text-red-600">{job.error}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <JobStatusBadge status={job.status} />
          {isCancellable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel?.(job.id)}
              disabled={isCancelling}
              aria-label="Cancel job"
            >
              <X size={14} />
            </Button>
          )}
          {isTrashed && onRestore && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onRestore(job.id);
              }}
              disabled={isMutating}
              aria-label="Restore job"
            >
              <RotateCcw size={14} />
            </Button>
          )}
          {!isTrashed && !isActive && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onDelete(job.id);
              }}
              disabled={isMutating}
              aria-label="Delete job"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
