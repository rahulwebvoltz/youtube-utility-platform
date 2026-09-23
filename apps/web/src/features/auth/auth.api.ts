import type {
  ChangePasswordInput,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@ytp/validators';
import type { User } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth-store.js';

interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const { user, accessToken } = await apiFetch<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setSession(user, accessToken);
  return user;
}

export async function loginUser(input: LoginInput): Promise<User> {
  const { user, accessToken } = await apiFetch<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setSession(user, accessToken);
  return user;
}

export async function logoutUser(): Promise<void> {
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
    useAuthStore.getState().setSession(user, accessToken);
  } catch {
    useAuthStore.getState().clearSession();
  }
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const user = await apiFetch<User>('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setUser(user);
  return user;
}

export async function changePassword(input: ChangePasswordInput): Promise<User> {
  const { user, accessToken } = await apiFetch<AuthResponse>('/api/v1/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setSession(user, accessToken);
  return user;
}

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  try {
    await apiFetch('/api/v1/users/me', {
      method: 'DELETE',
      body: JSON.stringify(input),
    });
  } finally {
    useAuthStore.getState().clearSession();
  }
}
