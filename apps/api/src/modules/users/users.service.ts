import bcrypt from 'bcryptjs';
import { CollectionModel, CollectionItemModel, JobModel, MediaFileModel } from '@ytp/db';
import type { UpdateProfileInput } from '@ytp/validators';
import { ApiError } from '@/middleware/errorHandler.js';
import { UserModel, type UserDocument } from '@/database/models/user.model.js';
import { RefreshTokenModel } from '@/database/models/refreshToken.model.js';
import { issueTokens, PASSWORD_SALT_ROUNDS, type AuthTokens } from '@/modules/auth/auth.service.js';
import { storageService } from '@/storage.js';

async function findUserOr404(userId: string): Promise<UserDocument> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }
  return user;
}

export async function getProfile(userId: string): Promise<UserDocument> {
  return findUserOr404(userId);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDocument> {
  const user = await UserModel.findByIdAndUpdate(userId, input, { new: true });
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }
  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ user: UserDocument } & AuthTokens> {
  const user = await findUserOr404(userId);

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await user.save();

  // Revoke every previously-issued refresh token - other devices/sessions must sign in
  // again with the new password - then mint a fresh pair so this device stays signed in.
  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
  const tokens = await issueTokens(user);

  return { user, ...tokens };
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await findUserOr404(userId);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Password is incorrect');
  }

  const collectionIds = await CollectionModel.find({ userId: user._id }).distinct('_id');
  const mediaFiles = await MediaFileModel.find({ userId: user._id }, { 'storage.key': 1 });

  await Promise.all([
    CollectionItemModel.deleteMany({ collectionId: { $in: collectionIds } }),
    CollectionModel.deleteMany({ userId: user._id }),
    JobModel.deleteMany({ userId: user._id }),
    RefreshTokenModel.deleteMany({ userId: user._id }),
    storageService.deleteObjects(mediaFiles.map((file) => file.storage.key)),
  ]);
  await MediaFileModel.deleteMany({ userId: user._id });

  await user.deleteOne();
}
