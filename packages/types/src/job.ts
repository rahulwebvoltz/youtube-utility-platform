import type { AudioFormat, AudioQuality, VideoFormat, VideoQuality } from './media.js';
import type { ExportKind } from './export.js';

export type JobType = 'metadata' | 'transcript' | 'audio' | 'video' | 'playlist' | 'export';

export type JobStatus =
  'queued' | 'started' | 'processing' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface JobSource {
  url?: string | undefined;
  videoId?: string | undefined;
  playlistId?: string | undefined;
  title?: string | undefined;
}

export interface Job<TOptions = Record<string, unknown>, TResult = Record<string, unknown>> {
  id: string;
  userId: string;
  parentJobId?: string | undefined;
  type: JobType;
  status: JobStatus;
  progress: number;
  stage?: string | undefined;
  source: JobSource;
  options: TOptions;
  result?: TResult | undefined;
  error?: string | undefined;
  createdAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  deletedAt?: string | undefined;
}

export interface JobProgressEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  stage?: string | undefined;
}

export type JobSocketEvent =
  | 'job:created'
  | 'job:started'
  | 'job:stage'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled';

export interface JobEventPayload {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  stage?: string | undefined;
  result?: unknown;
  error?: string | undefined;
}

export interface MetadataJobData {
  type: 'video' | 'playlist';
  youtubeId: string;
  jobId?: string | undefined;
}

export interface TranscriptJobData {
  jobId: string;
  videoId: string;
  youtubeId: string;
  /** Explicit language request - omitted means auto-detect the video's real caption language. */
  language?: string | undefined;
}

export interface TranscriptJobResult {
  transcriptId: string;
  language: string;
  wordCount: number;
  segmentCount: number;
}

export interface AudioJobData {
  jobId: string;
  userId: string;
  videoId: string;
  youtubeId: string;
  format: AudioFormat;
  quality: AudioQuality;
}

export interface VideoJobData {
  jobId: string;
  userId: string;
  videoId: string;
  youtubeId: string;
  format: VideoFormat;
  quality: VideoQuality;
}

export interface MediaJobResult {
  mediaFileId: string;
  format: string;
  size: number;
}

export interface PlaylistJobItem {
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: number;
}

export interface PlaylistJobData {
  jobId: string;
  userId: string;
  operation: 'transcript' | 'audio' | 'video';
  items: PlaylistJobItem[];
  language?: string | undefined;
  format?: AudioFormat | VideoFormat | undefined;
  quality?: AudioQuality | VideoQuality | undefined;
}

export interface PlaylistJobResult {
  total: number;
  succeeded: number;
  failed: number;
  childJobIds: string[];
}

export interface ExportJobData {
  jobId: string;
  userId: string;
  exportKind: ExportKind;
  format: string;
  /** For "playlist-manifest" - the Playlist's own YouTube id. */
  playlistId?: string | undefined;
  /** For "combined-transcript"/"media-bundle" - the orchestrator playlist Job's id, to find its completed children. */
  playlistJobId?: string | undefined;
}
