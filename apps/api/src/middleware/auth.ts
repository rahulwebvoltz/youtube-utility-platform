import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@ytp/types';
import { ApiError } from '@/middleware/errorHandler.js';
import { verifyAccessToken } from '@/modules/auth/jwt.js';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

function authenticate(req: Request): boolean {
  const token = extractToken(req);
  if (!token) return false;

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  next(
    authenticate(req)
      ? undefined
      : new ApiError(401, 'UNAUTHENTICATED', 'Missing or invalid access token'),
  );
}

/**
 * Like requireAuth, but a missing/invalid token is not an error - req.user is
 * simply left unset. Use for routes usable both anonymously and signed in.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  authenticate(req);
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Missing access token'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

/**
 * Reads the authenticated user's id off a request that's already passed
 * `requireAuth` - safe by construction (that middleware always runs first on
 * every route that calls this), but expressed this way instead of `req.user!.id`
 * so route handlers never need a non-null assertion.
 */
export function getUserId(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Missing access token');
  }
  return req.user.id;
}
