import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-200/80', className)} {...props} />;
}
