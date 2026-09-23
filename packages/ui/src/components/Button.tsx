import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/30',
  secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  outline: 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50',
  ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  // 40x40 meets the ~40px minimum touch target for icon-only buttons (no visible label).
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-150 ease-out active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
