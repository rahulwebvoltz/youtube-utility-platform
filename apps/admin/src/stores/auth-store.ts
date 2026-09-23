import { create } from 'zustand';
import type { User } from '@ytp/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => {
    set({ user, accessToken, status: 'authenticated' });
  },
  setStatus: (status) => {
    set({ status });
  },
  clearSession: () => {
    set({ user: null, accessToken: null, status: 'unauthenticated' });
  },
}));
