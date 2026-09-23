import { z } from 'zod';

export const audioFormatSchema = z.enum(['mp3', 'm4a', 'wav', 'flac']);
export const audioQualitySchema = z.enum(['128', '192', '256', '320']);

export const videoFormatSchema = z.enum(['mp4', 'mkv', 'webm']);
export const videoQualitySchema = z.enum([
  'original',
  '2160p',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
]);

export const createAudioJobSchema = z.object({
  videoId: z.string().min(1),
  format: audioFormatSchema,
  quality: audioQualitySchema,
});

export const createVideoJobSchema = z.object({
  videoId: z.string().min(1),
  format: videoFormatSchema,
  quality: videoQualitySchema,
});

export type CreateAudioJobInput = z.infer<typeof createAudioJobSchema>;
export type CreateVideoJobInput = z.infer<typeof createVideoJobSchema>;
