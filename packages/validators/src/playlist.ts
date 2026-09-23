import { z } from 'zod';
import {
  audioFormatSchema,
  audioQualitySchema,
  videoFormatSchema,
  videoQualitySchema,
} from './media.js';

export const playlistOperationSchema = z.enum(['transcript', 'audio', 'video']);

const playlistJobBase = {
  playlistId: z.string().min(1),
  videoIds: z.array(z.string().min(1)).min(1).max(500),
};

export const playlistBulkTranscriptSchema = z.object({
  ...playlistJobBase,
  operation: z.literal('transcript'),
  // Omitted means "auto-detect each video's real caption language" - never
  // defaulted to 'en', since that would just be guessing.
  language: z.string().min(2).max(10).optional(),
});

export const playlistBulkAudioSchema = z.object({
  ...playlistJobBase,
  operation: z.literal('audio'),
  format: audioFormatSchema,
  quality: audioQualitySchema,
});

export const playlistBulkVideoSchema = z.object({
  ...playlistJobBase,
  operation: z.literal('video'),
  format: videoFormatSchema,
  quality: videoQualitySchema,
});

// Bulk export (CSV/JSON/ZIP of combined results) is deferred to the Export
// Center phase, which is where combining multiple outputs into one file
// naturally belongs.
export const createPlaylistJobSchema = z.discriminatedUnion('operation', [
  playlistBulkTranscriptSchema,
  playlistBulkAudioSchema,
  playlistBulkVideoSchema,
]);

export type CreatePlaylistJobInput = z.infer<typeof createPlaylistJobSchema>;
