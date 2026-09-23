import { Worker } from 'bullmq';
import { VideoModel } from '@ytp/db';
import type {
  AudioFormat,
  AudioQuality,
  PlaylistJobData,
  PlaylistJobItem,
  PlaylistJobResult,
  VideoFormat,
  VideoQuality,
} from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { queues as fanoutQueues } from '@/queues/queues.js';
import { createChildJob } from '@/services/jobs/create-child-job.service.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

/**
 * Playlist analysis (Phase 3) only fetches lightweight per-item data via
 * yt-dlp's flat-playlist mode - no per-video Video document exists yet. This
 * ensures one exists (from the playlist item's own data) without ever
 * clobbering a fuller record a prior individual /analyzer call may have made:
 * $setOnInsert only applies on creation, so an existing doc is left untouched.
 */
async function ensureVideoDoc(item: PlaylistJobItem) {
  return VideoModel.findOneAndUpdate(
    { youtubeId: item.youtubeId },
    {
      $setOnInsert: {
        youtubeId: item.youtubeId,
        url: `https://www.youtube.com/watch?v=${item.youtubeId}`,
        metadata: {
          title: item.title,
          thumbnail: item.thumbnail,
          channelId: '',
          channelName: '',
          duration: item.duration,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export const playlistWorker = new Worker<PlaylistJobData, PlaylistJobResult>(
  'playlist.queue',
  async (job) => {
    const { jobId, userId, operation, items, language, format, quality } = job.data;
    logger.info({ jobId: job.id, operation, count: items.length }, 'processing playlist batch job');

    await markJobStarted(jobId);

    const childJobIds: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const [index, item] of items.entries()) {
      await updateJobProgress(
        jobId,
        Math.round((index / items.length) * 95),
        `Queuing ${index + 1}/${items.length}: ${item.title}`,
      );

      try {
        const video = await ensureVideoDoc(item);
        const videoId = video._id.toString();

        const childJob = await createChildJob({
          userId,
          parentJobId: jobId,
          type: operation,
          source: { videoId: item.youtubeId, title: item.title },
          options: operation === 'transcript' ? { language } : { format, quality },
        });

        if (operation === 'transcript') {
          await fanoutQueues.transcript.add(
            'extract',
            {
              jobId: childJob._id.toString(),
              videoId,
              youtubeId: item.youtubeId,
              language,
            },
            { jobId: childJob._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
          );
        } else if (operation === 'audio') {
          // format/quality are validated against `operation` by the Zod discriminated
          // union at job-creation time (playlists.routes.ts) - that guarantee doesn't
          // survive crossing the BullMQ queue boundary into PlaylistJobData's flat shape.
          /* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- see comment above */
          await fanoutQueues.audio.add(
            'process',
            {
              jobId: childJob._id.toString(),
              userId,
              videoId,
              youtubeId: item.youtubeId,
              format: format as AudioFormat,
              quality: quality as AudioQuality,
            },
            { jobId: childJob._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
          );
          /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
        } else {
          /* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- see comment above the audio branch */
          await fanoutQueues.video.add(
            'process',
            {
              jobId: childJob._id.toString(),
              userId,
              videoId,
              youtubeId: item.youtubeId,
              format: format as VideoFormat,
              quality: quality as VideoQuality,
            },
            { jobId: childJob._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
          );
          /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
        }

        childJobIds.push(childJob._id.toString());
        succeeded++;
      } catch (err) {
        failed++;
        logger.error({ err, youtubeId: item.youtubeId }, 'failed to queue playlist item job');
      }
    }

    // "Completed" here means every item was successfully fanned out into its
    // own job - not that those jobs have finished processing. The frontend
    // tracks real per-video completion via the child jobs themselves
    // (GET /jobs?parentJobId=...), each with its own live progress.
    const result: PlaylistJobResult = { total: items.length, succeeded, failed, childJobIds };
    await markJobCompleted(jobId, result);
    return result;
  },
  { connection: redisConnection, concurrency: 2 },
);

playlistWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'playlist batch job failed');
  if (job?.data.jobId) {
    void markJobFailed(job.data.jobId, err.message);
  }
});
