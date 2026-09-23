import { z } from 'zod';

export const collectionItemTypeSchema = z.enum(['video', 'playlist', 'transcript', 'media']);

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
});

export const addCollectionItemSchema = z.object({
  itemType: collectionItemTypeSchema,
  refId: z.string().min(1),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;
