import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-zinc-200 bg-white shadow-sm',
          interactive &&
            'transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg',
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';
