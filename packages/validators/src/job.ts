import { z } from 'zod';

export const jobTypeSchema = z.enum([
  'metadata',
  'transcript',
  'audio',
  'video',
  'playlist',
  'export',
]);

export const jobStatusSchema = z.enum([
  'queued',
  'started',
  'processing',
  'uploading',
  'completed',
  'failed',
  'cancelled',
]);

export const jobIdParamSchema = z.object({
  id: z.string().min(1),
});

export type JobIdParamInput = z.infer<typeof jobIdParamSchema>;
