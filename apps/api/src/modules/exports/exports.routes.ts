import { Router } from 'express';
import { createExportJobSchema } from '@ytp/validators';
import { PlaylistModel } from '@ytp/db';
import type { ExportJobData } from '@ytp/types';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { queues } from '@/queues/queues.js';
import { createJob, getJobForUser } from '@/modules/jobs/jobs.service.js';

export const exportsRouter = Router();

exportsRouter.use(requireAuth);

exportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createExportJobSchema.parse(req.body);

    let jobSource: { playlistId?: string | undefined };

    if (input.exportKind === 'playlist-manifest') {
      const playlist = await PlaylistModel.findOne({ youtubeId: input.playlistId });
      if (!playlist) {
        throw new ApiError(
          404,
          'PLAYLIST_NOT_ANALYZED',
          'Analyze this playlist before exporting it',
        );
      }
      jobSource = { playlistId: input.playlistId };
    } else {
      const playlistJob = await getJobForUser(input.playlistJobId, getUserId(req));
      if (playlistJob.type !== 'playlist') {
        throw new ApiError(400, 'INVALID_JOB', 'This job is not a playlist batch job');
      }
      jobSource = { playlistId: playlistJob.source.playlistId ?? undefined };
    }

    const job = await createJob({
      userId: getUserId(req),
      type: 'export',
      source: jobSource,
      options: { exportKind: input.exportKind, format: input.format },
    });

    const jobData: ExportJobData = {
      jobId: job._id.toString(),
      userId: getUserId(req),
      exportKind: input.exportKind,
      format: input.format,
      ...(input.exportKind === 'playlist-manifest'
        ? { playlistId: input.playlistId }
        : { playlistJobId: input.playlistJobId }),
    };

    await queues.export.add('build', jobData, {
      jobId: job._id.toString(),
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    res
      .status(202)
      .json({ success: true, data: { jobId: job._id.toString(), status: job.status } });
  }),
);
