import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store.js';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    // A function (not a static object) so every reconnect attempt picks up
    // whatever access token is current at that moment, not the one from connect time.
    auth: (cb) => {
      cb({ token: useAuthStore.getState().accessToken });
    },
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
