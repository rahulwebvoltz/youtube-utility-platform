import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400',
        'transition-all duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
