import { z } from 'zod';
import { loadEnv } from '@ytp/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Local filesystem storage - see @ytp/storage. STORAGE_ROOT must be the same
  // absolute path the worker is configured with, since both read/write it.
  STORAGE_ROOT: z.string().min(1),
  STORAGE_SIGNING_SECRET: z.string().min(1),
  API_PUBLIC_URL: z.string().default('http://localhost:4000'),

  WEB_APP_URL: z.string().default('http://localhost:3000'),
  ADMIN_APP_URL: z.string().default('http://localhost:3001'),
});

export const env = loadEnv(envSchema);
export type Env = typeof env;
