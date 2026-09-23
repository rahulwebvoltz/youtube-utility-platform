import { Queue } from 'bullmq';
import type {
  AudioJobData,
  ExportJobData,
  JobType,
  MetadataJobData,
  PlaylistJobData,
  TranscriptJobData,
  VideoJobData,
} from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';

const QUEUE_NAMES: Record<JobType, string> = {
  metadata: 'metadata.queue',
  transcript: 'transcript.queue',
  audio: 'audio.queue',
  video: 'video.queue',
  playlist: 'playlist.queue',
  export: 'export.queue',
};

const connection = { connection: redisConnection };

export const queues = {
  metadata: new Queue<MetadataJobData>(QUEUE_NAMES.metadata, connection),
  transcript: new Queue<TranscriptJobData>(QUEUE_NAMES.transcript, connection),
  audio: new Queue<AudioJobData>(QUEUE_NAMES.audio, connection),
  video: new Queue<VideoJobData>(QUEUE_NAMES.video, connection),
  playlist: new Queue<PlaylistJobData>(QUEUE_NAMES.playlist, connection),
  export: new Queue<ExportJobData>(QUEUE_NAMES.export, connection),
} satisfies Record<JobType, Queue>;
