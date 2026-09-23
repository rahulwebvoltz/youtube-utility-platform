import type { Server as SocketIOServer } from 'socket.io';
import type { JobEventPayload, JobSocketEvent } from '@ytp/types';
import { userRoom } from '@/websocket/socket.js';

let ioInstance: SocketIOServer | null = null;

export function setIO(io: SocketIOServer): void {
  ioInstance = io;
}

export function emitJobEvent(
  userId: string,
  event: JobSocketEvent,
  payload: JobEventPayload,
): void {
  ioInstance?.to(userRoom(userId)).emit(event, payload);
}
