import { createContext } from 'react';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant | undefined;
  durationMs?: number | undefined;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
