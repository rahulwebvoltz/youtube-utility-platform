import type { AudioFormat, VideoFormat } from '@ytp/types';

export const AUDIO_MIME_TYPES: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  flac: 'audio/flac',
};

export const VIDEO_MIME_TYPES: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
};

// The job id is folded into the filename (rather than its own directory
// level) purely to guarantee uniqueness - two jobs producing the same video
// title would otherwise collide. This keeps the tree at users/<id>/<type>/
// instead of a new near-empty jobs/<jobId>/<type>/ directory per download.
export function storageKey(
  userId: string,
  jobId: string,
  type: 'audio' | 'video' | 'export',
  filename: string,
): string {
  return `users/${userId}/${type}/${jobId}-${filename}`;
}

export const EXPORT_MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
  markdown: 'text/markdown',
  zip: 'application/zip',
};
