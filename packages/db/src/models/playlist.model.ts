import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const playlistSchema = new Schema(
  {
    youtubeId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String, required: true },
    itemCount: { type: Number, required: true, default: 0 },
    totalDuration: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export type PlaylistDocument = HydratedDocument<InferSchemaType<typeof playlistSchema>>;

export const PlaylistModel = model('Playlist', playlistSchema);
