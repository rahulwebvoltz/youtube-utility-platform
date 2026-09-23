import { Worker } from 'bullmq';
import { TranscriptModel, VideoModel } from '@ytp/db';
import type { TranscriptJobData, TranscriptJobResult } from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';
import { extractTranscript } from '@/services/transcript/transcript.service.js';
import {
  markJobCompleted,
  markJobFailed,
  markJobStarted,
  updateJobProgress,
} from '@/services/jobs/job-tracking.service.js';

export const transcriptWorker = new Worker<TranscriptJobData, TranscriptJobResult>(
  'transcript.queue',
  async (job) => {
    const { jobId, videoId, youtubeId, language } = job.data;
    logger.info({ jobId: job.id, youtubeId, language }, 'processing transcript job');

    await markJobStarted(jobId);
    await VideoModel.findByIdAndUpdate(videoId, { transcriptStatus: 'processing' });
    await updateJobProgress(jobId, 0, 'Checking caption availability');

    const extracted = await extractTranscript(youtubeId, language);
    if (!extracted) {
      await VideoModel.findByIdAndUpdate(videoId, { transcriptStatus: 'failed' });
      throw new Error('No captions are available for this video');
    }

    await updateJobProgress(jobId, 70, 'Normalizing transcript');

    const transcript = await TranscriptModel.findOneAndUpdate(
      { videoId, language: extracted.language },
      {
        videoId,
        language: extracted.language,
        source: extracted.source,
        segments: extracted.segments,
        plainText: extracted.plainText,
        wordCount: extracted.wordCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await VideoModel.findByIdAndUpdate(videoId, { transcriptStatus: 'completed' });

    const result: TranscriptJobResult = {
      transcriptId: transcript._id.toString(),
      language: transcript.language,
      wordCount: transcript.wordCount,
      segmentCount: transcript.segments.length,
    };

    await markJobCompleted(jobId, result);
    return result;
  },
  { connection: redisConnection, concurrency: 3 },
);

transcriptWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'transcript job failed');
  if (job?.data.jobId) {
    void markJobFailed(job.data.jobId, err.message);
  }
});
