import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '../components/toast-context.js';

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
