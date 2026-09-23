import path from 'node:path';
import { Worker } from 'bullmq';
import { MediaFileModel } from '@ytp/db';
import type { ExportJobData, MediaJobResult } from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { withTempDir } from '@/services/ytdlp/ytdlp.service.js';
import {
  buildCombinedTranscript,
  buildMediaBundle,
  buildPlaylistManifest,
} from '@/services/export/export.service.js';
import { EXPORT_MIME_TYPES, storageKey } from '@/services/media/media.util.js';
import { storageService } from '@/storage.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

export const exportWorker = new Worker<ExportJobData, MediaJobResult>(
  'export.queue',
  async (job) => {
    const { jobId, userId, exportKind, format, playlistId, playlistJobId } = job.data;
    logger.info({ jobId: job.id, exportKind, format }, 'processing export job');

    await markJobStarted(jobId);

    return withTempDir(`ytp-export-${jobId}-`, async (dir) => {
      await updateJobProgress(jobId, 0, 'Gathering results');

      const extension = format === 'markdown' ? 'md' : format;
      const outputPath = path.join(dir, `export.${extension}`);

      if (exportKind === 'playlist-manifest') {
        if (!playlistId) throw new Error('playlist-manifest export is missing playlistId');
        if (format !== 'csv' && format !== 'json')
          throw new Error(`Invalid manifest format: ${format}`);
        await buildPlaylistManifest(playlistId, format, outputPath);
      } else if (exportKind === 'combined-transcript') {
        if (!playlistJobId) throw new Error('combined-transcript export is missing playlistJobId');
        if (format !== 'txt' && format !== 'markdown' && format !== 'json') {
          throw new Error(`Invalid combined-transcript format: ${format}`);
        }
        await buildCombinedTranscript(playlistJobId, format, outputPath);
      } else {
        if (!playlistJobId) throw new Error('media-bundle export is missing playlistJobId');
        await updateJobProgress(jobId, 40, 'Downloading media files');
        await buildMediaBundle(playlistJobId, dir, outputPath);
      }

      await updateJobProgress(jobId, 80, 'Uploading export');
      const key = storageKey(userId, jobId, 'export', path.basename(outputPath));
      const mimeType = EXPORT_MIME_TYPES[format] ?? 'application/octet-stream';
      const size = await storageService.uploadFile(key, outputPath, mimeType);

      const mediaFile = await MediaFileModel.create({
        userId,
        jobId,
        type: 'export',
        format,
        mimeType,
        size,
        storage: { key },
      });

      const result: MediaJobResult = { mediaFileId: mediaFile._id.toString(), format, size };
      await markJobCompleted(jobId, result);
      return result;
    });
  },
  { connection: redisConnection, concurrency: 3 },
);

exportWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'export job failed');
  if (job?.data.jobId) {
    void markJobFailed(job.data.jobId, err.message);
  }
});
