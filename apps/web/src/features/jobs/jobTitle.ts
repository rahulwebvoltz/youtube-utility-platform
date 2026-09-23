import type { Job, JobType } from '@ytp/types';

const TYPE_LABELS: Record<JobType, string> = {
  metadata: 'Analysis',
  transcript: 'Transcript',
  audio: 'Audio',
  video: 'Video',
  playlist: 'Playlist',
  export: 'Export',
};

export function jobTitle(job: Job): string {
  const result = job.result as { title?: string } | undefined;
  // `||` (not `??`) is deliberate: an empty-string title should also fall through.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return result?.title || job.source.title || job.source.url || TYPE_LABELS[job.type];
}
