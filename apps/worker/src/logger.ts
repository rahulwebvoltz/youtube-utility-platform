import { createLogger } from '@ytp/logger';
import { env } from '@/config/env.js';

export const logger = createLogger({ name: 'worker', pretty: env.NODE_ENV !== 'production' });
