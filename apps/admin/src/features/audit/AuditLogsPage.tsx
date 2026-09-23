import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@ytp/ui';
import { listAuditLogs } from '@/features/admin/admin.api.js';

const PAGE_SIZE = 20;
const ACTIONS = [
  'user.role_changed',
  'user.disabled',
  'user.enabled',
  'job.cancelled',
  'job.deleted',
];

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', { page, action }],
    queryFn: () => listAuditLogs({ page, action: action || undefined }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Audit Logs</h1>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <Card className="divide-y divide-zinc-100">
        {isLoading && <p className="p-4 text-sm text-zinc-500">Loading...</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="p-4 text-sm text-zinc-500">No audit activity yet.</p>
        )}
        {data?.items.map((log) => (
          <div key={log.id} className="px-4 py-3 text-sm">
            <p className="text-zinc-800">
              <span className="font-medium">{log.actorEmail}</span> &middot; {log.action}
            </p>
            <p className="text-xs text-zinc-500">
              {log.targetType} {log.targetId} &middot; {new Date(log.createdAt).toLocaleString()}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <> &middot; {JSON.stringify(log.metadata)}</>
              )}
            </p>
          </div>
        ))}
      </Card>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} &middot; {data.total} entries
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
              }}
            >
              Previous
            </button>
            <button
              className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
