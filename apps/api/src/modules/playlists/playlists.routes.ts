import { Router } from 'express';
import { z } from 'zod';
import { createPlaylistJobSchema } from '@ytp/validators';
import {
  PlaylistModel,
  PlaylistItemModel,
  type PlaylistDocument,
  type PlaylistItemDocument,
} from '@ytp/db';
import type { PlaylistJobData } from '@ytp/types';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { queues } from '@/queues/queues.js';
import { createJob } from '@/modules/jobs/jobs.service.js';

export const playlistsRouter = Router();

playlistsRouter.use(requireAuth);

const youtubeIdParamSchema = z.object({
  youtubeId: z.string().min(1),
});

function toPublicPlaylist(playlist: PlaylistDocument) {
  return {
    id: playlist._id.toString(),
    youtubeId: playlist.youtubeId,
    title: playlist.title,
    description: playlist.description,
    thumbnail: playlist.thumbnail,
    itemCount: playlist.itemCount,
    totalDuration: playlist.totalDuration,
  };
}

function toPublicItem(item: PlaylistItemDocument) {
  return {
    id: item._id.toString(),
    videoId: item.videoId,
    position: item.position,
    title: item.title,
    thumbnail: item.thumbnail,
    duration: item.duration,
  };
}

playlistsRouter.get(
  '/:youtubeId',
  asyncHandler(async (req, res) => {
    const { youtubeId } = youtubeIdParamSchema.parse(req.params);

    const playlist = await PlaylistModel.findOne({ youtubeId });
    if (!playlist) {
      throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
    }

    const items = await PlaylistItemModel.find({ playlistId: playlist._id }).sort({ position: 1 });

    res.json({
      success: true,
      data: { playlist: toPublicPlaylist(playlist), items: items.map(toPublicItem) },
    });
  }),
);

playlistsRouter.post(
  '/jobs',
  asyncHandler(async (req, res) => {
    const input = createPlaylistJobSchema.parse(req.body);

    const playlist = await PlaylistModel.findOne({ youtubeId: input.playlistId });
    if (!playlist) {
      throw new ApiError(
        404,
        'PLAYLIST_NOT_ANALYZED',
        'Analyze this playlist before creating a batch job',
      );
    }

    const items = await PlaylistItemModel.find({
      playlistId: playlist._id,
      videoId: { $in: input.videoIds },
    }).sort({ position: 1 });

    if (items.length === 0) {
      throw new ApiError(
        400,
        'NO_VIDEOS_SELECTED',
        'No matching videos were found in this playlist',
      );
    }

    const options =
      input.operation === 'transcript'
        ? { operation: input.operation, language: input.language }
        : { operation: input.operation, format: input.format, quality: input.quality };

    const job = await createJob({
      userId: getUserId(req),
      type: 'playlist',
      source: { playlistId: input.playlistId },
      options: { ...options, videoCount: items.length },
    });

    const jobData: PlaylistJobData = {
      jobId: job._id.toString(),
      userId: getUserId(req),
      operation: input.operation,
      items: items.map((item) => ({
        youtubeId: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        duration: item.duration,
      })),
      ...(input.operation === 'transcript'
        ? { language: input.language }
        : { format: input.format, quality: input.quality }),
    };

    await queues.playlist.add('batch', jobData, {
      jobId: job._id.toString(),
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    res
      .status(202)
      .json({ success: true, data: { jobId: job._id.toString(), status: job.status } });
  }),
);
