import { Router } from 'express';
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from '@ytp/validators';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { getUserId, requireAuth } from '@/middleware/auth.js';
import { toPublicUser } from '@/modules/auth/auth.service.js';
import { clearRefreshCookie, setRefreshCookie } from '@/modules/auth/cookies.js';
import {
  changePassword,
  deleteAccount,
  getProfile,
  updateProfile,
} from '@/modules/users/users.service.js';

export const usersRouter = Router();

usersRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getProfile(getUserId(req));
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

usersRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const user = await updateProfile(getUserId(req), input);
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

usersRouter.patch(
  '/me/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await changePassword(
      getUserId(req),
      currentPassword,
      newPassword,
    );

    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user: toPublicUser(user), accessToken } });
  }),
);

usersRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = deleteAccountSchema.parse(req.body);
    await deleteAccount(getUserId(req), password);

    clearRefreshCookie(res);
    res.json({ success: true, data: { deleted: true } });
  }),
);
