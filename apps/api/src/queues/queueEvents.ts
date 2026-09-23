import { QueueEvents } from 'bullmq';
import { redisConnection } from '@/queues/redis.js';

// A dedicated connection per BullMQ primitive (Queue / Worker / QueueEvents) is
// required - sharing one connection across them causes blocking-command conflicts.
export const metadataQueueEvents = new QueueEvents('metadata.queue', {
  connection: redisConnection.duplicate(),
});
