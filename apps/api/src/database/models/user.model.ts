import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin', 'support'], default: 'user', required: true },
    isDisabled: { type: Boolean, default: false, required: true },
    emailVerifiedAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = model('User', userSchema);
