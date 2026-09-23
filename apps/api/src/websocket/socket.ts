import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type DefaultEventsMap } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '@/config/env.js';
import { logger } from '@/logger.js';
import { redisConnection } from '@/queues/redis.js';
import { verifyAccessToken } from '@/modules/auth/jwt.js';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

interface SocketData {
  userId: string;
}

type AppSocketServer = SocketIOServer<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

export function createSocketServer(httpServer: HttpServer): Promise<AppSocketServer> {
  const io: AppSocketServer = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.WEB_APP_URL, env.ADMIN_APP_URL],
      credentials: true,
    },
  });

  // A dedicated pub/sub pair (not the shared BullMQ connection) lets the worker
  // process - which never holds a live WebSocket connection - push events to
  // clients connected to this API instance via @socket.io/redis-emitter.
  const pubClient = redisConnection.duplicate();
  const subClient = redisConnection.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const rawToken: unknown = socket.handshake.auth['token'];
    const token = typeof rawToken === 'string' ? rawToken : undefined;
    if (!token) {
      next(new Error('UNAUTHENTICATED'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    void socket.join(userRoom(userId));
    logger.debug({ socketId: socket.id, userId }, 'socket connected');

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id, userId }, 'socket disconnected');
    });
  });

  return Promise.resolve(io);
}
