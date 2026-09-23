import { Router } from 'express';
import { loginSchema, registerSchema } from '@ytp/validators';
import { asyncHandler } from '@/middleware/asyncHandler.js';
import { ApiError } from '@/middleware/errorHandler.js';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from '@/modules/auth/cookies.js';
import { login, logout, refresh, register, toPublicUser } from '@/modules/auth/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await register(input);

    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user: toPublicUser(user), accessToken } });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await login(input);

    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user: toPublicUser(user), accessToken } });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawCookieToken: unknown = req.cookies[REFRESH_COOKIE_NAME];
    const cookieToken = typeof rawCookieToken === 'string' ? rawCookieToken : undefined;
    if (!cookieToken) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Missing refresh token');
    }

    const { user, accessToken, refreshToken } = await refresh(cookieToken);

    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user: toPublicUser(user), accessToken } });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawCookieToken: unknown = req.cookies[REFRESH_COOKIE_NAME];
    const cookieToken = typeof rawCookieToken === 'string' ? rawCookieToken : undefined;
    await logout(cookieToken);

    clearRefreshCookie(res);
    res.json({ success: true, data: { loggedOut: true } });
  }),
);
