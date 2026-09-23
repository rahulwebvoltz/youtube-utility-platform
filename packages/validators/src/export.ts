import { z } from 'zod';

const playlistManifestExportSchema = z.object({
  exportKind: z.literal('playlist-manifest'),
  playlistId: z.string().min(1),
  format: z.enum(['csv', 'json']),
});

const combinedTranscriptExportSchema = z.object({
  exportKind: z.literal('combined-transcript'),
  playlistJobId: z.string().min(1),
  format: z.enum(['txt', 'markdown', 'json']),
});

const mediaBundleExportSchema = z.object({
  exportKind: z.literal('media-bundle'),
  playlistJobId: z.string().min(1),
  format: z.literal('zip'),
});

export const createExportJobSchema = z.discriminatedUnion('exportKind', [
  playlistManifestExportSchema,
  combinedTranscriptExportSchema,
  mediaBundleExportSchema,
]);

export type CreateExportJobInput = z.infer<typeof createExportJobSchema>;
