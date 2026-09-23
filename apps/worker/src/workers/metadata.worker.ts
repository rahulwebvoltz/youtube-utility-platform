import { Worker } from 'bullmq';
import { VideoModel, PlaylistModel, PlaylistItemModel } from '@ytp/db';
import type { AnalyzerResult, MetadataJobData } from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { fetchPlaylistInfo, fetchVideoInfo } from '@/services/youtube/youtube.service.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

async function processVideo(youtubeId: string, jobId?: string): Promise<AnalyzerResult> {
  if (jobId) await updateJobProgress(jobId, 0, 'Fetching video metadata');

  const info = await fetchVideoInfo(youtubeId);

  if (jobId) await updateJobProgress(jobId, 80, 'Saving video');

  await VideoModel.findOneAndUpdate(
    { youtubeId: info.youtubeId },
    {
      youtubeId: info.youtubeId,
      url: `https://www.youtube.com/watch?v=${info.youtubeId}`,
      metadata: {
        title: info.title,
        description: info.description,
        thumbnail: info.thumbnail,
        channelId: info.channelId,
        channelName: info.channelName,
        duration: info.duration,
        publishedAt: info.publishedAt,
        viewCount: info.viewCount,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return {
    type: 'video',
    youtubeId: info.youtubeId,
    title: info.title,
    thumbnail: info.thumbnail,
    duration: info.duration,
    channelName: info.channelName,
    videoFormats: info.videoFormats,
    transcriptLanguages: info.transcriptLanguages,
  };
}

async function processPlaylist(youtubeId: string, jobId?: string): Promise<AnalyzerResult> {
  if (jobId) await updateJobProgress(jobId, 0, 'Fetching playlist metadata');

  const info = await fetchPlaylistInfo(youtubeId);

  if (jobId) await updateJobProgress(jobId, 80, 'Saving playlist items');

  const playlist = await PlaylistModel.findOneAndUpdate(
    { youtubeId: info.youtubeId },
    {
      youtubeId: info.youtubeId,
      title: info.title,
      description: info.description,
      thumbnail: info.thumbnail,
      itemCount: info.items.length,
      totalDuration: info.totalDuration,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (info.items.length > 0) {
    await PlaylistItemModel.bulkWrite(
      info.items.map((item) => ({
        updateOne: {
          filter: { playlistId: playlist._id, position: item.position },
          update: { $set: { ...item, playlistId: playlist._id } },
          upsert: true,
        },
      })),
    );
  }

  return {
    type: 'playlist',
    youtubeId: info.youtubeId,
    title: info.title,
    thumbnail: info.thumbnail,
    itemCount: info.items.length,
  };
}

export const metadataWorker = new Worker<MetadataJobData, AnalyzerResult>(
  'metadata.queue',
  async (job) => {
    const { type, youtubeId, jobId } = job.data;
    logger.info({ jobId: job.id, data: job.data }, 'processing metadata job');

    if (jobId) await markJobStarted(jobId);

    const result =
      type === 'video'
        ? await processVideo(youtubeId, jobId)
        : await processPlaylist(youtubeId, jobId);

    if (jobId) await markJobCompleted(jobId, result);

    return result;
  },
  { connection: redisConnection, concurrency: 5 },
);

metadataWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'metadata job failed');
  const trackedJobId = job?.data.jobId;
  if (trackedJobId) {
    void markJobFailed(trackedJobId, err.message);
  }
});
