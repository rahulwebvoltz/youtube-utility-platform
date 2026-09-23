// Populates the env vars `@/config/env.ts` validates at import time, so test
// files can import real service modules without a real `.env` file or a
// running Mongo/Redis - every model/connection those services touch is
// mocked per-test instead.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.STORAGE_ROOT = '/tmp/test-storage';
process.env.STORAGE_SIGNING_SECRET = 'test-signing-secret';
