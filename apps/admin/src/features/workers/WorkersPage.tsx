import { useQuery } from '@tanstack/react-query';
import { Badge, Card } from '@ytp/ui';
import { listWorkers } from '@/features/admin/admin.api.js';

function formatUptime(startedAt: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function WorkersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'workers'],
    queryFn: listWorkers,
    refetchInterval: 5_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Workers</h1>
      <Card className="divide-y divide-zinc-100">
        {isLoading && <p className="p-4 text-sm text-zinc-500">Loading...</p>}
        {!isLoading && data?.length === 0 && (
          <p className="p-4 text-sm text-zinc-500">No workers reporting yet.</p>
        )}
        {data?.map((worker) => (
          <div
            key={worker.instanceId}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900">
                {worker.hostname} <span className="text-xs text-zinc-400">pid {worker.pid}</span>
              </p>
              <p className="truncate text-xs text-zinc-500">
                queues: {worker.queues.join(', ')} &middot; up {formatUptime(worker.startedAt)}
              </p>
            </div>
            <Badge variant="success">Online</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
