import type { LoginInput } from '@ytp/validators';
import type { User } from '@ytp/types';
import { apiFetch, ApiClientError } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth-store.js';

interface AuthResponse {
  user: User;
  accessToken: string;
}

const ADMIN_ROLES: User['role'][] = ['admin', 'support'];

export async function loginAdmin(input: LoginInput): Promise<User> {
  const { user, accessToken } = await apiFetch<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!ADMIN_ROLES.includes(user.role)) {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    throw new ApiClientError('FORBIDDEN', 'This account does not have admin access');
  }

  useAuthStore.getState().setSession(user, accessToken);
  return user;
}

export async function logoutAdmin(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    useAuthStore.getState().clearSession();
  }
}

export async function bootstrapSession(): Promise<void> {
  useAuthStore.getState().setStatus('loading');
  try {
    const { user, accessToken } = await apiFetch<AuthResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      skipAuthRetry: true,
    });

    if (!ADMIN_ROLES.includes(user.role)) {
      useAuthStore.getState().clearSession();
      return;
    }

    useAuthStore.getState().setSession(user, accessToken);
  } catch {
    useAuthStore.getState().clearSession();
  }
}
