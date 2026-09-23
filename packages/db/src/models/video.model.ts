import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const videoMetadataSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String, required: true },
    channelId: { type: String, required: true },
    channelName: { type: String, required: true },
    duration: { type: Number, required: true },
    publishedAt: { type: Date },
    viewCount: { type: Number },
  },
  { _id: false },
);

const videoSchema = new Schema(
  {
    youtubeId: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    metadata: { type: videoMetadataSchema, required: true },
    transcriptStatus: {
      type: String,
      enum: ['not_started', 'processing', 'completed', 'failed'],
      default: 'not_started',
      required: true,
    },
    mediaStatus: {
      type: String,
      enum: ['not_started', 'processing', 'completed', 'failed'],
      default: 'not_started',
      required: true,
    },
  },
  { timestamps: true },
);

export type VideoDocument = HydratedDocument<InferSchemaType<typeof videoSchema>>;

export const VideoModel = model('Video', videoSchema);
