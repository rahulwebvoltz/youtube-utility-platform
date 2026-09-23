import { useQuery } from '@tanstack/react-query';
import { Badge, Card } from '@ytp/ui';
import { getSystemHealth } from '@/features/admin/admin.api.js';

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: getSystemHealth,
    refetchInterval: 10_000,
  });

  const allHealthy = data && data.mongo.connected && data.redis.connected;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900">System Health</h1>
      {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
      {data && (
        <Card className="divide-y divide-zinc-100">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-zinc-800">Overall</span>
            <Badge variant={allHealthy ? 'success' : 'danger'}>
              {allHealthy ? 'All systems nominal' : 'Degraded'}
            </Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-700">API process</span>
            <span className="text-zinc-500">
              uptime {formatUptime(data.api.uptimeSeconds)} &middot; node {data.api.nodeVersion}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-700">MongoDB</span>
            <Badge variant={data.mongo.connected ? 'success' : 'danger'}>
              {data.mongo.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-zinc-700">Redis</span>
            <Badge variant={data.redis.connected ? 'success' : 'danger'}>
              {data.redis.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
