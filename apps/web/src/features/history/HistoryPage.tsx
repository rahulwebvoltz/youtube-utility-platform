import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Inbox, Search, Trash2 } from 'lucide-react';
import type { JobType } from '@ytp/types';
import { Button, Skeleton, useToast, cn } from '@ytp/ui';
import {
  useCancelJobMutation,
  useDeleteJobMutation,
  useJobsQuery,
  useRestoreJobMutation,
} from '@/features/jobs/useJobs.js';
import { JobRow } from '@/features/history/components/JobRow.js';
import { jobTitle } from '@/features/jobs/jobTitle.js';

const TABS: { label: string; type?: JobType }[] = [
  { label: 'All' },
  { label: 'Analysis', type: 'metadata' },
  { label: 'Transcript', type: 'transcript' },
  { label: 'Audio', type: 'audio' },
  { label: 'Video', type: 'video' },
  { label: 'Playlist', type: 'playlist' },
];

export function HistoryPage() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  const { data, isLoading } = useJobsQuery(20, showTrash);
  const cancelMutation = useCancelJobMutation();
  const deleteMutation = useDeleteJobMutation();
  const restoreMutation = useRestoreJobMutation();
  const { show } = useToast();

  const activeType = TABS.find((tab) => tab.label === activeTab)?.type;

  const jobs = useMemo(() => {
    let items = data?.items ?? [];
    if (activeType) items = items.filter((job) => job.type === activeType);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      items = items.filter((job) => jobTitle(job).toLowerCase().includes(needle));
    }
    return items;
  }, [data, activeType, search]);

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id, {
      onError: () => {
        show({ title: 'Could not cancel job', variant: 'error' });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onError: () => {
        show({ title: 'Could not delete job', variant: 'error' });
      },
    });
  };

  const handleRestore = (id: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => {
        show({ title: 'Job restored', variant: 'success' });
      },
      onError: () => {
        show({ title: 'Could not restore job', variant: 'error' });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">History</h1>
        <Button
          variant={showTrash ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            setShowTrash((value) => !value);
          }}
        >
          <Trash2 size={14} />
          {showTrash ? 'Back to History' : 'Trash'}
        </Button>
      </div>

      {!showTrash && (
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setActiveTab(tab.label);
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.label
                  ? 'bg-brand-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          placeholder="Search history..."
          className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
          <Inbox size={32} />
          <p className="text-sm">{showTrash ? 'Trash is empty.' : 'No jobs yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onCancel={showTrash ? undefined : handleCancel}
                isCancelling={cancelMutation.isPending && cancelMutation.variables === job.id}
                onDelete={showTrash ? undefined : handleDelete}
                onRestore={showTrash ? handleRestore : undefined}
                isMutating={
                  (deleteMutation.isPending && deleteMutation.variables === job.id) ||
                  (restoreMutation.isPending && restoreMutation.variables === job.id)
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
