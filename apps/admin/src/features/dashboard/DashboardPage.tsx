import { useQuery } from '@tanstack/react-query';
import { Card, Skeleton } from '@ytp/ui';
import { getDashboardStats } from '@/features/admin/admin.api.js';

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: 15_000,
  });

  const metrics = [
    { label: 'Total users', value: data?.totalUsers },
    { label: `Active users (7d)`, value: data?.activeUsers },
    { label: 'Total jobs', value: data?.totalJobs },
    { label: 'Completed jobs', value: data?.completedJobs },
    { label: 'Failed jobs', value: data?.failedJobs },
    { label: 'Queue length', value: data?.queueLength },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-zinc-900">{metric.value ?? 0}</div>
            )}
            <div className="mt-1 text-sm text-zinc-500">{metric.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
