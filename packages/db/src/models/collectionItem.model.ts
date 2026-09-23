import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const COLLECTION_ITEM_TYPES = ['video', 'playlist', 'transcript', 'media'] as const;

const collectionItemSchema = new Schema(
  {
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', required: true, index: true },
    itemType: { type: String, enum: COLLECTION_ITEM_TYPES, required: true },
    // Meaning depends on itemType: the YouTube id for "video"/"playlist" (there's
    // no local id worth referencing), the Mongo _id for "transcript"/"media"
    // (multiple transcripts can exist per video, by language, so the specific
    // document must be pinned).
    refId: { type: String, required: true },
  },
  // Plain `createdAt` (not a custom-named timestamp) - Mongoose's TS type
  // inference for renamed timestamp fields is unreliable; the API layer
  // exposes this as `addedAt` in its public response shape instead.
  { timestamps: { createdAt: true, updatedAt: false } },
);

collectionItemSchema.index({ collectionId: 1, itemType: 1, refId: 1 }, { unique: true });

export type CollectionItemDocument = HydratedDocument<InferSchemaType<typeof collectionItemSchema>>;

export const CollectionItemModel = model('CollectionItem', collectionItemSchema);
