import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const playlistItemSchema = new Schema(
  {
    playlistId: { type: Schema.Types.ObjectId, ref: 'Playlist', required: true, index: true },
    videoId: { type: String, required: true },
    position: { type: Number, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String, required: true },
    duration: { type: Number, required: true },
  },
  { timestamps: true },
);

playlistItemSchema.index({ playlistId: 1, position: 1 }, { unique: true });

export type PlaylistItemDocument = HydratedDocument<InferSchemaType<typeof playlistItemSchema>>;

export const PlaylistItemModel = model('PlaylistItem', playlistItemSchema);
