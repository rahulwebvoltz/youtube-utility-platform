import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const TRANSCRIPT_SOURCES = ['youtube_captions', 'asr'] as const;

const transcriptSegmentSchema = new Schema(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const transcriptSchema = new Schema(
  {
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    language: { type: String, required: true },
    source: { type: String, enum: TRANSCRIPT_SOURCES, required: true },
    segments: { type: [transcriptSegmentSchema], default: [] },
    plainText: { type: String, required: true },
    wordCount: { type: Number, required: true },
  },
  { timestamps: true },
);

// One transcript per video/language pair - a later request for the same pair
// overwrites (upsert), rather than accumulating duplicates.
transcriptSchema.index({ videoId: 1, language: 1 }, { unique: true });

export type TranscriptDocument = HydratedDocument<InferSchemaType<typeof transcriptSchema>>;

export const TranscriptModel = model('Transcript', transcriptSchema);
