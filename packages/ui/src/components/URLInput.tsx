import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface URLInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSubmitUrl?: (value: string) => void;
}

export const URLInput = forwardRef<HTMLInputElement, URLInputProps>(
  ({ className, onSubmitUrl, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="url"
        placeholder="Paste YouTube URL"
        className={cn(
          'h-14 w-full rounded-xl border border-zinc-200 bg-white px-5 text-base text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400',
          'transition-all duration-200',
          'focus:border-brand-500 focus:shadow-lg focus:shadow-brand-500/10 focus:ring-4 focus:ring-brand-500/10',
          className,
        )}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmitUrl?.(event.currentTarget.value);
          }
        }}
        {...props}
      />
    );
  },
);

URLInput.displayName = 'URLInput';
