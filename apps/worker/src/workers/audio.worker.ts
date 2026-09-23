import path from 'node:path';
import { Worker } from 'bullmq';
import { MediaFileModel, VideoModel } from '@ytp/db';
import type { AudioJobData, MediaJobResult } from '@ytp/types';
import { sanitizeFilename } from '@ytp/utils';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { downloadAudioSource, withTempDir } from '@/services/ytdlp/ytdlp.service.js';
import { transcodeAudio } from '@/services/ffmpeg/ffmpeg.service.js';
import { AUDIO_MIME_TYPES, storageKey } from '@/services/media/media.util.js';
import { storageService } from '@/storage.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

export const audioWorker = new Worker<AudioJobData, MediaJobResult>(
  'audio.queue',
  async (job) => {
    const { jobId, userId, videoId, youtubeId, format, quality } = job.data;
    logger.info({ jobId: job.id, youtubeId, format, quality }, 'processing audio job');

    await markJobStarted(jobId);
    await VideoModel.findByIdAndUpdate(videoId, { mediaStatus: 'processing' });

    return withTempDir(`ytp-audio-${jobId}-`, async (dir) => {
      await updateJobProgress(jobId, 0, 'Downloading audio');
      const sourcePath = await downloadAudioSource(youtubeId, dir, (percent) => {
        // Map yt-dlp's own 0-100% download progress onto this job's 0-50%
        // "Downloading audio" span, so the bar climbs from 0 instead of
        // jumping straight to a preset checkpoint before any real work happens.
        void updateJobProgress(jobId, Math.round((percent / 100) * 50), 'Downloading audio');
      });

      await updateJobProgress(jobId, 50, 'Converting audio');
      const outputPath = path.join(dir, `output.${format}`);
      await transcodeAudio(sourcePath, outputPath, format, quality);

      await updateJobProgress(jobId, 80, 'Uploading file');
      const video = await VideoModel.findById(videoId);
      const filename = `${sanitizeFilename(video?.metadata.title ?? youtubeId)}.${format}`;
      const key = storageKey(userId, jobId, 'audio', filename);
      const size = await storageService.uploadFile(key, outputPath, AUDIO_MIME_TYPES[format]);

      const mediaFile = await MediaFileModel.create({
        userId,
        jobId,
        type: 'audio',
        format,
        mimeType: AUDIO_MIME_TYPES[format],
        size,
        storage: { key },
      });

      await VideoModel.findByIdAndUpdate(videoId, { mediaStatus: 'completed' });

      const result: MediaJobResult = { mediaFileId: mediaFile._id.toString(), format, size };
      await markJobCompleted(jobId, result);
      return result;
    });
  },
  { connection: redisConnection, concurrency: 2 },
);

audioWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'audio job failed');
  if (job?.data.videoId) {
    void VideoModel.findByIdAndUpdate(job.data.videoId, { mediaStatus: 'failed' });
  }
  if (job?.data.jobId) {
    void markJobFailed(job.data.jobId, err.message);
  }
});
