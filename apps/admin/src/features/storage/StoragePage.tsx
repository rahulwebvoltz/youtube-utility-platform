import { useQuery } from '@tanstack/react-query';
import { Card } from '@ytp/ui';
import { formatBytes } from '@ytp/utils';
import { getStorageStats } from '@/features/admin/admin.api.js';

export function StoragePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: getStorageStats,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Storage</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <div className="text-2xl font-bold text-zinc-900">{data.totalFiles}</div>
          <div className="text-sm text-zinc-500">Total files</div>
        </Card>
        <Card className="p-5">
          <div className="text-2xl font-bold text-zinc-900">{formatBytes(data.totalBytes)}</div>
          <div className="text-sm text-zinc-500">Total size</div>
        </Card>
        {data.byType.map((t) => (
          <Card key={t.type} className="p-5">
            <div className="text-2xl font-bold text-zinc-900">{formatBytes(t.bytes)}</div>
            <div className="text-sm text-zinc-500 capitalize">
              {t.type} ({t.count})
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">Top users by storage used</h2>
        <Card className="divide-y divide-zinc-100">
          {data.topUsers.length === 0 && <p className="p-4 text-sm text-zinc-500">No files yet.</p>}
          {data.topUsers.map((u) => (
            <div key={u.userId} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-zinc-800">{u.email}</span>
              <span className="text-zinc-500">
                {formatBytes(u.bytes)} &middot; {u.count} files
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
