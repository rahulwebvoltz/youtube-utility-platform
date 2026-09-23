import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { ToastContext, type ToastOptions, type ToastVariant } from './toast-context.js';

export type { ToastVariant, ToastOptions } from './toast-context.js';

interface ToastItem extends ToastOptions {
  id: string;
  phase: 'entering' | 'visible' | 'leaving';
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'border-zinc-200 bg-white text-zinc-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

const EXIT_ANIMATION_MS = 200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, phase: 'leaving' } : t)));
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_ANIMATION_MS);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...options, id, phase: 'entering' }]);
      // Flip to "visible" on the next frame so the initial classes actually transition in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setToasts((current) =>
            current.map((t) => (t.id === id ? { ...t, phase: 'visible' } : t)),
          );
        });
      });
      const timer = setTimeout(() => {
        remove(id);
      }, options.durationMs ?? 4000);
      timers.current.set(id, timer);
    },
    [remove],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-lg border px-4 py-3 shadow-lg transition-all duration-200',
              toast.phase === 'visible' ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0',
              VARIANT_CLASSES[toast.variant ?? 'default'],
            )}
          >
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
