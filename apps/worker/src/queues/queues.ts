import { Queue } from 'bullmq';
import type { AudioJobData, TranscriptJobData, VideoJobData } from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';

const connection = { connection: redisConnection };

// The playlist worker fans out into these queues itself (a job's processor
// enqueuing further jobs) - everywhere else, only the API enqueues jobs.
export const queues = {
  transcript: new Queue<TranscriptJobData>('transcript.queue', connection),
  audio: new Queue<AudioJobData>('audio.queue', connection),
  video: new Queue<VideoJobData>('video.queue', connection),
};
