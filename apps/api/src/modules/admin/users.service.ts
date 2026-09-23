import { JobModel, MediaFileModel } from '@ytp/db';
import type { UserRole } from '@ytp/types';
import { UserModel, type UserDocument } from '@/database/models/user.model.js';
import { RefreshTokenModel } from '@/database/models/refreshToken.model.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { recordAuditLog } from '@/modules/admin/audit.service.js';

export async function listUsers(
  options: {
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
  } = {},
): Promise<{ items: UserDocument[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20));
  const search = options.search?.trim();
  const filter = search
    ? {
        $or: [
          { email: new RegExp(escapeRegExp(search), 'i') },
          { name: new RegExp(escapeRegExp(search), 'i') },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    UserModel.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserOr404(userId: string): Promise<UserDocument> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }
  return user;
}

export async function getUserDetail(userId: string) {
  const user = await findUserOr404(userId);

  const [totalJobs, mediaAgg] = await Promise.all([
    JobModel.countDocuments({ userId }),
    MediaFileModel.aggregate<{ _id: null; count: number; bytes: number }>([
      { $match: { userId: user._id } },
      { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$size' } } },
    ]),
  ]);

  return {
    user,
    stats: {
      totalJobs,
      totalMediaFiles: mediaAgg[0]?.count ?? 0,
      totalStorageBytes: mediaAgg[0]?.bytes ?? 0,
    },
  };
}

export async function updateUserRole(
  actor: UserDocument,
  targetId: string,
  role: UserRole,
): Promise<UserDocument> {
  if (actor._id.toString() === targetId) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'You cannot change your own role');
  }

  const user = await findUserOr404(targetId);
  const previousRole = user.role;
  user.role = role;
  await user.save();

  await recordAuditLog(actor, 'user.role_changed', 'user', targetId, {
    from: previousRole,
    to: role,
  });
  return user;
}

export async function setUserDisabled(
  actor: UserDocument,
  targetId: string,
  disabled: boolean,
): Promise<UserDocument> {
  if (actor._id.toString() === targetId) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'You cannot disable your own account');
  }

  const user = await findUserOr404(targetId);
  user.isDisabled = disabled;
  await user.save();

  if (disabled) {
    // Force sign-out everywhere - a disabled account shouldn't be able to keep
    // refreshing its session with an already-issued refresh token.
    await RefreshTokenModel.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
  }

  await recordAuditLog(actor, disabled ? 'user.disabled' : 'user.enabled', 'user', targetId);
  return user;
}
