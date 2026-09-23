import { Emitter } from '@socket.io/redis-emitter';
import type { JobEventPayload, JobSocketEvent } from '@ytp/types';
import { redisConnection } from '@/queues/redis.js';

// Publishes into the same Redis channels the API's @socket.io/redis-adapter
// subscribes to - this is how a process with no live WebSocket connections
// (the worker) can push events to browsers connected to the API.
const emitter = new Emitter(redisConnection.duplicate());

function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitJobEvent(
  userId: string,
  event: JobSocketEvent,
  payload: JobEventPayload,
): void {
  emitter.to(userRoom(userId)).emit(event, payload);
}
