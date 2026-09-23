import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { JobModel, MediaFileModel, VideoModel } from '@ytp/db';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { storageService } from '@/storage.js';

export const filesRouter = Router();

const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.zip': 'application/zip',
};

function guessMimeType(key: string): string {
  return EXTENSION_MIME_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}

const rawFileQuerySchema = z.object({
  key: z.string().min(1),
  signature: z.string().min(1),
  disposition: z.enum(['inline', 'attachment']).optional(),
});

// Not behind requireAuth - access is controlled by the HMAC signature in the URL,
// the same trust model a cloud provider's presigned URL would use.
filesRouter.get(
  '/raw',
  asyncHandler((req, res) => {
    const { key, signature, disposition } = rawFileQuerySchema.parse(req.query);

    if (!storageService.verifySignedRequest(key, signature)) {
      throw new ApiError(403, 'INVALID_SIGNATURE', 'This download link is invalid');
    }

    const filePath = storageService.resolveFilePath(key);
    res.setHeader('Content-Type', guessMimeType(key));
    // Signed URLs are meant to be embeddable cross-origin (a different web app's
    // <video>/<audio> tag, not just same-origin) - the signature is what gates access.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Disposition',
      `${disposition ?? 'attachment'}; filename="${encodeURIComponent(path.basename(key))}"`,
    );
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res
          .status(404)
          .json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
      }
    });

    return Promise.resolve();
  }),
);

filesRouter.use(requireAuth);

filesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const mediaFiles = await MediaFileModel.find({
      userId: getUserId(req),
      type: { $in: ['audio', 'video'] },
    }).sort({ createdAt: -1 });

    const jobs = await JobModel.find(
      { _id: { $in: mediaFiles.map((file) => file.jobId) } },
      { 'source.title': 1, 'source.videoId': 1 },
    );
    const jobById = new Map(jobs.map((job) => [job._id.toString(), job]));

    const videos = await VideoModel.find(
      { youtubeId: { $in: jobs.map((job) => job.source.videoId).filter(Boolean) } },
      { youtubeId: 1, 'metadata.thumbnail': 1 },
    );
    const thumbnailByYoutubeId = new Map(
      videos.map((video) => [video.youtubeId, video.metadata.thumbnail]),
    );

    const data = await Promise.all(
      mediaFiles.map(async (file) => {
        const job = jobById.get(file.jobId.toString());
        const thumbnail = job?.source.videoId
          ? thumbnailByYoutubeId.get(job.source.videoId)
          : undefined;

        return {
          id: file._id.toString(),
          type: file.type,
          format: file.format,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt.toISOString(),
          title: job?.source.title,
          thumbnail,
          url: await storageService.getSignedDownloadUrl(file.storage.key),
        };
      }),
    );

    res.json({ success: true, data });
  }),
);

const fileIdParamSchema = z.object({
  id: z.string().min(1),
});

filesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = fileIdParamSchema.parse(req.params);

    const mediaFile = await MediaFileModel.findOne({ _id: id, userId: getUserId(req) });
    if (!mediaFile) {
      throw new ApiError(404, 'NOT_FOUND', 'File not found');
    }

    const url = await storageService.getSignedDownloadUrl(mediaFile.storage.key);

    res.json({
      success: true,
      data: {
        url,
        format: mediaFile.format,
        mimeType: mediaFile.mimeType,
        size: mediaFile.size,
      },
    });
  }),
);
