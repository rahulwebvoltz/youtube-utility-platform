import mongoose from 'mongoose';
import { JobModel, MediaFileModel } from '@ytp/db';
import type { JobType, MediaType } from '@ytp/types';
import { UserModel } from '@/database/models/user.model.js';
import { queues } from '@/queues/queues.js';
import { redisConnection } from '@/queues/redis.js';

const QUEUE_TYPES: JobType[] = ['metadata', 'transcript', 'audio', 'video', 'playlist', 'export'];
const ACTIVE_WINDOW_DAYS = 7;
const HEARTBEAT_SCAN_PATTERN = 'worker:heartbeat:*';

export async function getQueueStats() {
  return Promise.all(
    QUEUE_TYPES.map(async (type) => {
      const queue = queues[type];
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
      );
      return {
        name: queue.name,
        waiting: counts['waiting'] ?? 0,
        active: counts['active'] ?? 0,
        delayed: counts['delayed'] ?? 0,
        completed: counts['completed'] ?? 0,
        failed: counts['failed'] ?? 0,
      };
    }),
  );
}

export async function getDashboardStats() {
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [totalUsers, totalJobs, completedJobs, failedJobs, activeUserIds, queueStats] =
    await Promise.all([
      UserModel.countDocuments(),
      JobModel.countDocuments(),
      JobModel.countDocuments({ status: 'completed' }),
      JobModel.countDocuments({ status: 'failed' }),
      JobModel.distinct('userId', { createdAt: { $gte: activeSince } }),
      getQueueStats(),
    ]);

  const queueLength = queueStats.reduce((sum, q) => sum + q.waiting + q.active, 0);

  return {
    totalUsers,
    activeUsers: activeUserIds.length,
    totalJobs,
    completedJobs,
    failedJobs,
    queueLength,
  };
}

interface WorkerHeartbeat {
  instanceId: string;
  hostname: string;
  pid: number;
  queues: string[];
  startedAt: string;
  lastSeenAt: string;
}

export async function getWorkerHeartbeats(): Promise<WorkerHeartbeat[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redisConnection.scan(
      cursor,
      'MATCH',
      HEARTBEAT_SCAN_PATTERN,
      'COUNT',
      100,
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  if (keys.length === 0) return [];

  const values = await redisConnection.mget(...keys);
  return values
    .filter((value): value is string => value !== null)
    .map((value) => {
      // Trusted, self-written data - only the worker's own heartbeat service
      // (apps/worker/src/services/heartbeat.service.ts) ever writes these keys.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
      return JSON.parse(value) as WorkerHeartbeat;
    })
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
}

export async function getStorageStats() {
  const byType = await MediaFileModel.aggregate<{ _id: MediaType; count: number; bytes: number }>([
    { $group: { _id: '$type', count: { $sum: 1 }, bytes: { $sum: '$size' } } },
  ]);

  const topUsersRaw = await MediaFileModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
    bytes: number;
  }>([
    { $group: { _id: '$userId', count: { $sum: 1 }, bytes: { $sum: '$size' } } },
    { $sort: { bytes: -1 } },
    { $limit: 10 },
  ]);

  const users = await UserModel.find({ _id: { $in: topUsersRaw.map((u) => u._id) } }).select(
    'email name',
  );
  const usersById = new Map(users.map((u) => [u._id.toString(), u]));

  return {
    totalFiles: byType.reduce((sum, t) => sum + t.count, 0),
    totalBytes: byType.reduce((sum, t) => sum + t.bytes, 0),
    byType: byType.map((t) => ({ type: t._id, count: t.count, bytes: t.bytes })),
    topUsers: topUsersRaw.map((u) => ({
      userId: u._id.toString(),
      email: usersById.get(u._id.toString())?.email ?? '(deleted user)',
      count: u.count,
      bytes: u.bytes,
    })),
  };
}

export async function getSystemHealth() {
  let redisConnected = false;
  try {
    // ioredis's ping() resolves with "PONG" or throws - never any other value.
    await redisConnection.ping();
    redisConnected = true;
  } catch {
    redisConnected = false;
  }

  return {
    api: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
    },
    mongo: {
      connected: mongoose.connection.readyState === mongoose.ConnectionStates.connected,
    },
    redis: {
      connected: redisConnected,
    },
  };
}
