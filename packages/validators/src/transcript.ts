import { z } from 'zod';

export const transcriptExportFormatSchema = z.enum(['txt', 'srt', 'vtt', 'json', 'markdown']);

export const createTranscriptJobSchema = z.object({
  videoId: z.string().min(1),
  // Omitted means "auto-detect the video's real caption language" - never
  // defaulted to 'en', since that would just be guessing.
  language: z.string().min(2).max(10).optional(),
});

export type CreateTranscriptJobInput = z.infer<typeof createTranscriptJobSchema>;
