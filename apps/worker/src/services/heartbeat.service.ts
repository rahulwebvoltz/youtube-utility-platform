import os from 'node:os';
import crypto from 'node:crypto';
import { redisConnection } from '@/queues/redis.js';
import { logger } from '@/logger.js';

const HEARTBEAT_TTL_SECONDS = 20;
const HEARTBEAT_INTERVAL_MS = 10_000;

const instanceId = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
const heartbeatKey = `worker:heartbeat:${instanceId}`;

export function startHeartbeat(queueNames: string[]): () => Promise<void> {
  const startedAt = new Date().toISOString();

  const beat = async (): Promise<void> => {
    try {
      await redisConnection.set(
        heartbeatKey,
        JSON.stringify({
          instanceId,
          hostname: os.hostname(),
          pid: process.pid,
          queues: queueNames,
          startedAt,
          lastSeenAt: new Date().toISOString(),
        }),
        'EX',
        HEARTBEAT_TTL_SECONDS,
      );
    } catch (err) {
      logger.error({ err }, 'failed to write worker heartbeat');
    }
  };

  void beat();
  const interval = setInterval(() => {
    void beat();
  }, HEARTBEAT_INTERVAL_MS);
  interval.unref();

  return async () => {
    clearInterval(interval);
    await redisConnection.del(heartbeatKey).catch(() => undefined);
  };
}
