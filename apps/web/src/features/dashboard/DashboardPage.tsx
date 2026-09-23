import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, Skeleton } from '@ytp/ui';
import { useJobsQuery } from '@/features/jobs/useJobs.js';
import { JobRow } from '@/features/history/components/JobRow.js';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const ACTIVE_STATUSES = new Set(['queued', 'started', 'processing', 'uploading']);

export function DashboardPage() {
  const { data, isLoading } = useJobsQuery();

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.total ?? 0,
      completed: items.filter((job) => job.status === 'completed').length,
      active: items.filter((job) => ACTIVE_STATUSES.has(job.status)).length,
    };
  }, [data]);

  const recentJobs = data?.items.slice(0, 5) ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.h1 variants={item} className="text-2xl font-semibold text-zinc-900">
        Dashboard
      </motion.h1>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Total jobs', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'In progress', value: stats.active },
        ].map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <Card interactive className="p-3 sm:p-5">
              <div className="text-lg font-bold text-zinc-900 sm:text-2xl">{stat.value}</div>
              <div className="text-xs text-zinc-500 sm:text-sm">{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">Recent Jobs</h2>
          <Link to="/history" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : recentJobs.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-zinc-500">No jobs yet.</p>
          </Card>
        ) : (
          recentJobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </motion.div>
    </motion.div>
  );
}
