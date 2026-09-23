import { Router } from 'express';
import { z } from 'zod';
import { createTranscriptJobSchema } from '@ytp/validators';
import { VideoModel, TranscriptModel } from '@ytp/db';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { queues } from '@/queues/queues.js';
import { createJob } from '@/modules/jobs/jobs.service.js';

export const transcriptsRouter = Router();

transcriptsRouter.use(requireAuth);

function toPublicTranscript(transcript: InstanceType<typeof TranscriptModel>) {
  return {
    id: transcript._id.toString(),
    videoId: transcript.videoId.toString(),
    language: transcript.language,
    source: transcript.source,
    segments: transcript.segments,
    plainText: transcript.plainText,
    wordCount: transcript.wordCount,
    createdAt: transcript.createdAt.toISOString(),
    updatedAt: transcript.updatedAt.toISOString(),
  };
}

transcriptsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    // The validator's field is named "videoId" per the spec's job-creation
    // contract, but the value is the YouTube id (e.g. "dQw4w9WgXcQ"), not our
    // Video document's Mongo _id - that's resolved below.
    const { videoId: youtubeId, language } = createTranscriptJobSchema.parse(req.body);

    const video = await VideoModel.findOne({ youtubeId });
    if (!video) {
      throw new ApiError(
        404,
        'VIDEO_NOT_ANALYZED',
        'Analyze this video before requesting a transcript',
      );
    }

    const job = await createJob({
      userId: getUserId(req),
      type: 'transcript',
      source: { videoId: youtubeId, title: video.metadata.title },
      options: { language },
    });

    await queues.transcript.add(
      'extract',
      { jobId: job._id.toString(), videoId: video._id.toString(), youtubeId, language },
      { jobId: job._id.toString(), removeOnComplete: 100, removeOnFail: 100 },
    );

    res
      .status(202)
      .json({ success: true, data: { jobId: job._id.toString(), status: job.status } });
  }),
);

const getTranscriptQuerySchema = z.object({
  // Omitted means "whichever language this video's transcript actually is in"
  // - never defaulted to 'en', since that would just be guessing.
  language: z.string().min(2).max(10).optional(),
});

const youtubeIdParamSchema = z.object({
  youtubeId: z.string().min(1),
});

transcriptsRouter.get(
  '/:youtubeId',
  asyncHandler(async (req, res) => {
    const { language } = getTranscriptQuerySchema.parse(req.query);
    const { youtubeId } = youtubeIdParamSchema.parse(req.params);

    const video = await VideoModel.findOne({ youtubeId });
    if (!video) {
      throw new ApiError(404, 'NOT_FOUND', 'Video not found');
    }

    // Fall back to whatever language this video's transcript actually got saved
    // in (e.g. the video's real spoken language, like Gujarati) instead of
    // 404ing on a mismatch, if a specific language was requested and isn't it.
    const transcript = language
      ? ((await TranscriptModel.findOne({ videoId: video._id, language })) ??
        (await TranscriptModel.findOne({ videoId: video._id }).sort({ createdAt: -1 })))
      : await TranscriptModel.findOne({ videoId: video._id }).sort({ createdAt: -1 });
    if (!transcript) {
      throw new ApiError(404, 'NOT_FOUND', 'Transcript not found');
    }

    res.json({ success: true, data: toPublicTranscript(transcript) });
  }),
);
