import { cn } from '../lib/cn.js';

export interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 20 }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-current', className)}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z"
      />
    </svg>
  );
}
