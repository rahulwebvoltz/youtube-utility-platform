import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const JOB_TYPES = ['metadata', 'transcript', 'audio', 'video', 'playlist', 'export'] as const;

const JOB_STATUSES = [
  'queued',
  'started',
  'processing',
  'uploading',
  'completed',
  'failed',
  'cancelled',
] as const;

const jobSourceSchema = new Schema(
  {
    url: { type: String },
    videoId: { type: String },
    playlistId: { type: String },
    title: { type: String },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentJobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
    type: { type: String, enum: JOB_TYPES, required: true, index: true },
    status: { type: String, enum: JOB_STATUSES, default: 'queued', required: true, index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    stage: { type: String },
    source: { type: jobSourceSchema, default: {} },
    options: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

export type JobDocument = HydratedDocument<InferSchemaType<typeof jobSchema>>;

export const JobModel = model('Job', jobSchema);
