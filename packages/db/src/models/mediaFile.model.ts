import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const MEDIA_TYPES = ['audio', 'video', 'export'] as const;

const mediaFileStorageSchema = new Schema(
  {
    key: { type: String, required: true },
  },
  { _id: false },
);

const mediaFileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    type: { type: String, enum: MEDIA_TYPES, required: true },
    format: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storage: { type: mediaFileStorageSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mediaFileSchema.index({ userId: 1, createdAt: -1 });

export type MediaFileDocument = HydratedDocument<InferSchemaType<typeof mediaFileSchema>>;

export const MediaFileModel = model('MediaFile', mediaFileSchema);
