import path from 'node:path';
import { Worker } from 'bullmq';
import { MediaFileModel, VideoModel } from '@ytp/db';
import type { MediaJobResult, VideoJobData } from '@ytp/types';
import { sanitizeFilename } from '@ytp/utils';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { downloadVideoSource, withTempDir } from '@/services/ytdlp/ytdlp.service.js';
import { remuxVideo } from '@/services/ffmpeg/ffmpeg.service.js';
import { VIDEO_MIME_TYPES, storageKey } from '@/services/media/media.util.js';
import { storageService } from '@/storage.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

export const videoWorker = new Worker<VideoJobData, MediaJobResult>(
  'video.queue',
  async (job) => {
    const { jobId, userId, videoId, youtubeId, format, quality } = job.data;
    logger.info({ jobId: job.id, youtubeId, format, quality }, 'processing video job');

    await markJobStarted(jobId);
    await VideoModel.findByIdAndUpdate(videoId, { mediaStatus: 'processing' });

    return withTempDir(`ytp-video-${jobId}-`, async (dir) => {
      await updateJobProgress(jobId, 0, 'Downloading video');
      const sourcePath = await downloadVideoSource(youtubeId, quality, dir, (percent) => {
        // Map yt-dlp's own 0-100% download progress onto this job's 0-60%
        // "Downloading video" span, so the bar climbs from 0 instead of
        // jumping straight to a preset checkpoint before any real work happens.
        void updateJobProgress(jobId, Math.round((percent / 100) * 60), 'Downloading video');
      });

      await updateJobProgress(jobId, 60, 'Finalizing video file');
      const outputPath = path.join(dir, `output.${format}`);
      await remuxVideo(sourcePath, outputPath, format);

      await updateJobProgress(jobId, 80, 'Uploading file');
      const video = await VideoModel.findById(videoId);
      const filename = `${sanitizeFilename(video?.metadata.title ?? youtubeId)}.${format}`;
      const key = storageKey(userId, jobId, 'video', filename);
      const size = await storageService.uploadFile(key, outputPath, VIDEO_MIME_TYPES[format]);

      const mediaFile = await MediaFileModel.create({
        userId,
        jobId,
        type: 'video',
        format,
        mimeType: VIDEO_MIME_TYPES[format],
        size,
        storage: { key },
      });

      await VideoModel.findByIdAndUpdate(videoId, { mediaStatus: 'completed' });

      const result: MediaJobResult = { mediaFileId: mediaFile._id.toString(), format, size };
      await markJobCompleted(jobId, result);
      return result;
    });
  },
  { connection: redisConnection, concurrency: 1 },
);

videoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'video job failed');
  if (job?.data.videoId) {
    void VideoModel.findByIdAndUpdate(job.data.videoId, { mediaStatus: 'failed' });
  }
  if (job?.data.jobId) {
    void markJobFailed(job.data.jobId, err.message);
  }
});
