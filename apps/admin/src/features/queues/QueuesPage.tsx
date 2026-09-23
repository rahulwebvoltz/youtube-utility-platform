import { useQuery } from '@tanstack/react-query';
import { Card } from '@ytp/ui';
import { listQueues } from '@/features/admin/admin.api.js';

export function QueuesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: listQueues,
    refetchInterval: 5_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Queues</h1>
      <Card className="divide-y divide-zinc-100">
        {isLoading && <p className="p-4 text-sm text-zinc-500">Loading...</p>}
        {data?.map((queue) => (
          <div key={queue.name} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-zinc-800">{queue.name}</span>
            <span className="text-zinc-500">
              Waiting {queue.waiting} &middot; Active {queue.active} &middot; Delayed{' '}
              {queue.delayed} &middot; Completed {queue.completed} &middot; Failed {queue.failed}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
