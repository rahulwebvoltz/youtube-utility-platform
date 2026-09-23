import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const collectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CollectionDocument = HydratedDocument<InferSchemaType<typeof collectionSchema>>;

export const CollectionModel = model('Collection', collectionSchema);
