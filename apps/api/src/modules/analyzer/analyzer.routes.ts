import { Router } from 'express';
import { analyzerRequestSchema, extractYoutubeId } from '@ytp/validators';
import type { AnalyzerResult, MetadataJobData } from '@ytp/types';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { optionalAuth } from '@/middleware/auth.js';
import { queues } from '@/queues/queues.js';
import { metadataQueueEvents } from '@/queues/queueEvents.js';
import { createJob } from '@/modules/jobs/jobs.service.js';

export const analyzerRouter = Router();

const ANALYZE_TIMEOUT_MS = 30_000;

analyzerRouter.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { url } = analyzerRequestSchema.parse(req.body);
    const { videoId, playlistId } = extractYoutubeId(url);

    let type: MetadataJobData['type'];
    let youtubeId: string;
    if (videoId) {
      type = 'video';
      youtubeId = videoId;
    } else if (playlistId) {
      type = 'playlist';
      youtubeId = playlistId;
    } else {
      throw new ApiError(422, 'UNRECOGNIZED_URL', 'Could not determine content type from this URL');
    }

    // Signed-in users get a persisted Job (shows up in History/Dashboard, carries
    // live progress over the socket); anonymous analysis stays a one-off preview.
    const jobDoc = req.user
      ? await createJob({
          userId: req.user.id,
          type: 'metadata',
          source: { url, videoId, playlistId },
        })
      : undefined;

    const jobId = jobDoc?._id.toString();
    const bullJobData: MetadataJobData = { type, youtubeId, jobId };
    const bullJob = await queues.metadata.add('analyze', bullJobData, {
      ...(jobId ? { jobId } : {}),
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    let result: AnalyzerResult;
    try {
      // BullMQ's waitUntilFinished isn't generic-typed to the queue's result type
      // in the installed version - the job's actual shape is guaranteed by the
      // metadata worker, which always returns an AnalyzerResult on success.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
      result = (await bullJob.waitUntilFinished(
        metadataQueueEvents,
        ANALYZE_TIMEOUT_MS,
      )) as AnalyzerResult;
    } catch {
      throw new ApiError(502, 'METADATA_FETCH_FAILED', 'Could not fetch metadata for this URL');
    }

    res.json({ success: true, data: result });
  }),
);
