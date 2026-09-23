import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn.js';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

const EXIT_ANIMATION_MS = 150;

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => {
        cancelAnimationFrame(raf);
      };
    }

    setVisible(false);
    const timer = setTimeout(() => {
      setMounted(false);
    }, EXIT_ANIMATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className={cn(
          'absolute inset-0 cursor-default bg-black/40 transition-opacity duration-150',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full max-w flex-col rounded-xl bg-white p-6 shadow-xl transition-all duration-150',
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
          className,
        )}
      >
        {title && <h2 className="mb-4 shrink-0 text-lg font-semibold text-zinc-900">{title}</h2>}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
