import { describe, it, expect, beforeEach, vi } from 'vitest';

interface FakeUser {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'support';
  isDisabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeRefreshToken {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | undefined;
}

// vi.mock factories are hoisted above every import, so anything they close
// over must come from vi.hoisted too - this is the standard Vitest pattern
// for building stateful mocks instead of one-off return values per test.
const {
  userStore,
  refreshTokenStore,
  redisStore,
  resetStores,
  UserModel,
  RefreshTokenModel,
  redisConnection,
} = vi.hoisted(() => {
  const userStore = new Map<string, FakeUser>();
  const refreshTokenStore = new Map<string, FakeRefreshToken>();
  const redisStore = new Map<string, string>();

  const UserModel = {
    create: vi.fn((data: { email: string; name: string; passwordHash: string }) => {
      const doc: FakeUser = {
        _id: `user-${userStore.size + 1}`,
        role: 'user',
        isDisabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      userStore.set(doc._id, doc);
      return Promise.resolve(doc);
    }),
    findOne: vi.fn(({ email }: { email: string }) =>
      Promise.resolve([...userStore.values()].find((u) => u.email === email) ?? null),
    ),
    findById: vi.fn((id: string) => Promise.resolve(userStore.get(id) ?? null)),
  };

  const RefreshTokenModel = {
    create: vi.fn((data: { userId: string; tokenHash: string; expiresAt: Date }) => {
      const doc: FakeRefreshToken = {
        _id: `rt-${refreshTokenStore.size + 1}`,
        revokedAt: undefined,
        ...data,
      };
      refreshTokenStore.set(doc._id, doc);
      return Promise.resolve(doc);
    }),
    findById: vi.fn((id: string) => {
      const stored = refreshTokenStore.get(id);
      if (!stored) return Promise.resolve(null);
      // The returned object IS what the service mutates (tokenDoc.revokedAt = ...)
      // before calling .save() - so save() just needs to persist this same
      // reference back into the store, matching a real Mongoose document.
      const doc: FakeRefreshToken & { save: () => Promise<void> } = {
        ...stored,
        save: () => {
          refreshTokenStore.set(id, {
            _id: doc._id,
            userId: doc.userId,
            tokenHash: doc.tokenHash,
            expiresAt: doc.expiresAt,
            revokedAt: doc.revokedAt,
          });
          return Promise.resolve();
        },
      };
      return Promise.resolve(doc);
    }),
    updateMany: vi.fn(
      (filter: { userId: string; revokedAt?: unknown }, update: { revokedAt: Date }) => {
        for (const doc of refreshTokenStore.values()) {
          if (doc.userId === filter.userId && !doc.revokedAt) {
            doc.revokedAt = update.revokedAt;
          }
        }
        return Promise.resolve();
      },
    ),
  };

  const redisConnection = {
    get: vi.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve('OK');
    }),
  };

  return {
    userStore,
    refreshTokenStore,
    redisStore,
    resetStores: () => {
      userStore.clear();
      refreshTokenStore.clear();
      redisStore.clear();
    },
    UserModel,
    RefreshTokenModel,
    redisConnection,
  };
});

vi.mock('@/database/models/user.model.js', () => ({ UserModel }));
vi.mock('@/database/models/refreshToken.model.js', () => ({ RefreshTokenModel }));
vi.mock('@/queues/redis.js', () => ({ redisConnection }));

const { register, login, refresh } = await import('@/modules/auth/auth.service.js');
const { ApiError } = await import('@/middleware/errorHandler.js');

beforeEach(() => {
  resetStores();
  vi.clearAllMocks();
});

describe('register', () => {
  it('creates a user and issues a token pair', async () => {
    const result = await register({ email: 'a@example.com', name: 'A', password: 'password123' });

    expect(result.user.email).toBe('a@example.com');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejects a duplicate email', async () => {
    await register({ email: 'a@example.com', name: 'A', password: 'password123' });

    await expect(
      register({ email: 'a@example.com', name: 'A2', password: 'password123' }),
    ).rejects.toMatchObject({ code: 'EMAIL_IN_USE' });
  });
});

describe('login', () => {
  it('rejects a wrong password', async () => {
    await register({ email: 'a@example.com', name: 'A', password: 'password123' });

    await expect(
      login({ email: 'a@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('rejects a disabled account', async () => {
    await register({ email: 'a@example.com', name: 'A', password: 'password123' });
    const user = userStore.get('user-1');
    if (!user) throw new Error('test setup failed: user-1 was not created');
    user.isDisabled = true;

    await expect(login({ email: 'a@example.com', password: 'password123' })).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED',
    });
  });
});

describe('refresh', () => {
  it('rotates a valid token and issues a new pair', async () => {
    const { refreshToken } = await register({
      email: 'a@example.com',
      name: 'A',
      password: 'password123',
    });

    const result = await refresh(refreshToken);

    expect(result.refreshToken).not.toBe(refreshToken);
    expect(refreshTokenStore.size).toBe(2); // original (now revoked) + the new one
  });

  // The actual bug fix: a rotated-away token replayed shortly after (two tabs
  // both refreshing, or a response lost to a page navigation) must NOT be
  // treated as theft - it should converge on the session that rotation
  // already produced instead of logging the user out.
  it('returns the same session for a same-token retry inside the grace period', async () => {
    const { refreshToken } = await register({
      email: 'a@example.com',
      name: 'A',
      password: 'password123',
    });

    const first = await refresh(refreshToken);
    const second = await refresh(refreshToken); // same original token, presented again

    expect(second.accessToken).toBe(first.accessToken);
    expect(second.refreshToken).toBe(first.refreshToken);
    // No other session was revoked as a side effect of this retry.
    const activeTokens = [...refreshTokenStore.values()].filter((t) => !t.revokedAt);
    expect(activeTokens).toHaveLength(1);
  });

  it('treats a replay after the grace period as theft and revokes every session', async () => {
    const { refreshToken } = await register({
      email: 'a@example.com',
      name: 'A',
      password: 'password123',
    });

    await refresh(refreshToken);
    redisStore.clear(); // simulate the grace-period cache entry having expired

    await expect(refresh(refreshToken)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });

    const stillActive = [...refreshTokenStore.values()].filter((t) => !t.revokedAt);
    expect(stillActive).toHaveLength(0);
  });

  it('treats a hash mismatch on a still-active token as theft, with no grace period', async () => {
    const { refreshToken } = await register({
      email: 'a@example.com',
      name: 'A',
      password: 'password123',
    });
    // The combined token is `<jwt>.<rawSecret>`, and the jwt itself is
    // dot-separated (header.payload.signature) - split at the LAST dot only,
    // matching splitRefreshToken()'s own logic, so the JWT itself still
    // verifies and only the secret portion is wrong.
    const jwtPart = refreshToken.slice(0, refreshToken.lastIndexOf('.'));
    const tampered = `${jwtPart}.not-the-real-secret`;

    await expect(refresh(tampered)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });

    const stillActive = [...refreshTokenStore.values()].filter((t) => !t.revokedAt);
    expect(stillActive).toHaveLength(0);
  });

  it('rejects garbage input without throwing an unhandled error', async () => {
    await expect(refresh('not-a-real-token')).rejects.toBeInstanceOf(ApiError);
  });
});
