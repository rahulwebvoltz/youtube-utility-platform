import { Router } from 'express';
import { createAudioJobSchema, createVideoJobSchema } from '@ytp/validators';
import { VideoModel } from '@ytp/db';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { queues } from '@/queues/queues.js';
import { createJob } from '@/modules/jobs/jobs.service.js';

export const mediaRouter = Router();

mediaRouter.use(requireAuth);

async function findAnalyzedVideo(youtubeId: string) {
  const video = await VideoModel.findOne({ youtubeId });
  if (!video) {
    throw new ApiError(404, 'VIDEO_NOT_ANALYZED', 'Analyze this video before requesting media');
  }
  return video;
}

mediaRouter.post(
  '/audio',
  asyncHandler(async (req, res) => {
    const { videoId: youtubeId, format, quality } = createAudioJobSchema.parse(req.body);
    const video = await findAnalyzedVideo(youtubeId);

    const job = await createJob({
      userId: getUserId(req),
      type: 'audio',
      source: { videoId: youtubeId, title: video.metadata.title },
      options: { format, quality },
    });

    await queues.audio.add(
      'process',
      {
        jobId: job._id.toString(),
        userId: getUserId(req),
        videoId: video._id.toString(),
        youtubeId,
        format,
        quality,
      },
      { jobId: job._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
    );

    res
      .status(202)
      .json({ success: true, data: { jobId: job._id.toString(), status: job.status } });
  }),
);

mediaRouter.post(
  '/video',
  asyncHandler(async (req, res) => {
    const { videoId: youtubeId, format, quality } = createVideoJobSchema.parse(req.body);
    const video = await findAnalyzedVideo(youtubeId);

    const job = await createJob({
      userId: getUserId(req),
      type: 'video',
      source: { videoId: youtubeId, title: video.metadata.title },
      options: { format, quality },
    });

    await queues.video.add(
      'process',
      {
        jobId: job._id.toString(),
        userId: getUserId(req),
        videoId: video._id.toString(),
        youtubeId,
        format,
        quality,
      },
      { jobId: job._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
    );

    res
      .status(202)
      .json({ success: true, data: { jobId: job._id.toString(), status: job.status } });
  }),
);
