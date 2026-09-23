import type { User } from '@ytp/types';
import { useAuthStore } from '@/stores/auth-store.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const REFRESH_PATH = '/api/v1/auth/refresh';

// A real Error subclass - not just a `{code, message, details}` shape - so
// `throw` sites satisfy only-throw-error while every existing
// `(err as ApiClientError).message`/`.code` access pattern keeps working
// unchanged (the server's JSON error body already has exactly these fields).
export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
  }
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

let refreshPromise: Promise<{ user: User; accessToken: string }> | null = null;

async function requestRefresh(): Promise<{ user: User; accessToken: string }> {
  refreshPromise ??= apiFetch<{ user: User; accessToken: string }>(REFRESH_PATH, {
    method: 'POST',
    skipAuthRetry: true,
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRetry, ...requestInit } = init;
  const accessToken = useAuthStore.getState().accessToken;

  const headers = new Headers(requestInit.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestInit,
      credentials: 'include',
      headers,
    });
  } catch {
    // fetch() itself throws (not an HTTP error response) when the server is
    // unreachable - wrong port, backend not running, no network, CORS block.
    // Left unwrapped, this surfaces to users as a raw "TypeError: Failed to
    // fetch", which is meaningless to anyone who isn't debugging the network tab.
    throw new ApiClientError(
      'NETWORK_ERROR',
      'Could not reach the server. Please check your connection and try again.',
    );
  }

  let body: ApiEnvelope<T>;
  try {
    // The fetch API's json() is inherently untyped - this is the one place that
    // boundary gets a type, everything downstream works with a known shape.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError('INVALID_RESPONSE', 'The server sent back an unexpected response.');
  }

  if (!response.ok || !body.success) {
    const errorBody = body.error ?? { code: 'UNKNOWN', message: 'Request failed' };
    const error = new ApiClientError(errorBody.code, errorBody.message, errorBody.details);

    if (error.code === 'UNAUTHENTICATED' && !skipAuthRetry && path !== REFRESH_PATH) {
      try {
        const { accessToken: newAccessToken, user } = await requestRefresh();
        useAuthStore.getState().setSession(user, newAccessToken);
        return await apiFetch<T>(path, { ...init, skipAuthRetry: true });
      } catch {
        useAuthStore.getState().clearSession();
      }
    }

    throw error;
  }

  // T is caller-specified (apiFetch<SomeShape>(...)) - this boundary can't verify
  // it any further than the envelope check above already has.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
  return body.data as T;
}
