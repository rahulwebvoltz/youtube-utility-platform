import { connectDatabase as connect } from '@ytp/db';
import { env } from '@/config/env.js';
import { logger } from '@/logger.js';

export async function connectDatabase(): Promise<void> {
  await connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
}
