import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { Job } from '@ytp/types';
import { Card } from '@ytp/ui';

export function JobProgressCard({ job }: { job: Job }) {
  return (
    <Card className="p-6 text-center">
      <Loader2 className="mx-auto mb-3 animate-spin text-brand-600" size={28} />
      <p className="text-sm font-medium text-zinc-900">{job.stage ?? 'Processing...'}</p>
      <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          className="h-full rounded-full bg-brand-500"
          animate={{ width: `${job.progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-400">{job.progress}%</p>
    </Card>
  );
}
