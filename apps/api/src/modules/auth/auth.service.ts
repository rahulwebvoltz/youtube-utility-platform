import crypto from 'node:crypto';
import ms from 'ms';
import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput } from '@ytp/validators';
import { env } from '@/config/env.js';
import { ApiError } from '@/middleware/errorHandler.js';
import { UserModel, type UserDocument } from '@/database/models/user.model.js';
import { RefreshTokenModel } from '@/database/models/refreshToken.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/modules/auth/jwt.js';

export const PASSWORD_SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isDisabled: user.isDisabled,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function issueTokens(user: UserDocument): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
  });

  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const refreshTokenDoc = await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_TTL)),
  });

  const refreshJwt = signRefreshToken({
    sub: user._id.toString(),
    jti: refreshTokenDoc._id.toString(),
  });

  // The cookie value carries both the JWT (proves the jti wasn't tampered with)
  // and the raw secret (proves possession, since only its hash is stored server-side).
  return { accessToken, refreshToken: `${refreshJwt}.${rawRefreshToken}` };
}

function splitRefreshToken(combined: string): { jwt: string; raw: string } {
  const separatorIndex = combined.lastIndexOf('.');
  if (separatorIndex === -1) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }
  return { jwt: combined.slice(0, separatorIndex), raw: combined.slice(separatorIndex + 1) };
}

export async function register(input: RegisterInput): Promise<{ user: UserDocument } & AuthTokens> {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
  const user = await UserModel.create({ email: input.email, name: input.name, passwordHash });
  const tokens = await issueTokens(user);

  return { user, ...tokens };
}

export async function login(input: LoginInput): Promise<{ user: UserDocument } & AuthTokens> {
  const user = await UserModel.findOne({ email: input.email });
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.isDisabled) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', 'This account has been disabled');
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function refresh(combinedToken: string): Promise<{ user: UserDocument } & AuthTokens> {
  const { jwt: jwtToken, raw } = splitRefreshToken(combinedToken);

  let payload;
  try {
    payload = verifyRefreshToken(jwtToken);
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const tokenDoc = await RefreshTokenModel.findById(payload.jti);
  if (!tokenDoc) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  // A rotated (or logged-out) token being presented again, or a hash mismatch on a
  // still-active token, both indicate the token was stolen: revoke every session for
  // this user rather than just rejecting the one request.
  if (tokenDoc.revokedAt || tokenDoc.tokenHash !== hashToken(raw)) {
    await RefreshTokenModel.updateMany(
      { userId: tokenDoc.userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  if (tokenDoc.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const user = await UserModel.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  if (user.isDisabled) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', 'This account has been disabled');
  }

  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

export async function logout(combinedToken: string | undefined): Promise<void> {
  if (!combinedToken) return;

  try {
    const { jwt: jwtToken } = splitRefreshToken(combinedToken);
    const payload = verifyRefreshToken(jwtToken);
    await RefreshTokenModel.findByIdAndUpdate(payload.jti, { revokedAt: new Date() });
  } catch {
    // Already invalid/expired - nothing to revoke.
  }
}
