import jwt from 'jsonwebtoken';
import type { UserRole } from '@ytp/types';
import { env } from '@/config/env.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

// jsonwebtoken's `expiresIn` wants its own branded `StringValue` type ("15m",
// "30d", ...) rather than plain `string` - our env schema already validates the
// format, so this is a safe interop cast, not a real type hole.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
const ACCESS_TTL = env.JWT_ACCESS_TTL as NonNullable<jwt.SignOptions['expiresIn']>;
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
const REFRESH_TTL = env.JWT_REFRESH_TTL as NonNullable<jwt.SignOptions['expiresIn']>;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // jwt.verify's return type can't know our custom payload shape - this is the
  // standard jsonwebtoken pattern, safe because every token was signed by
  // signAccessToken above with exactly this payload shape.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & jwt.JwtPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above verifyAccessToken
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & jwt.JwtPayload;
}
