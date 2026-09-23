import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Input } from '@ytp/ui';
import { listUsers } from '@/features/admin/admin.api.js';

const PAGE_SIZE = 20;

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { page, search }],
    queryFn: () => listUsers({ page, search: search || undefined }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
        <Input
          placeholder="Search by name or email..."
          className="w-64"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card className="divide-y divide-zinc-100">
        {isLoading && <p className="p-4 text-sm text-zinc-500">Loading...</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="p-4 text-sm text-zinc-500">No users found.</p>
        )}
        {data?.items.map((user) => (
          <Link
            key={user.id}
            to={`/users/${user.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-zinc-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {user.isDisabled && <Badge variant="danger">Disabled</Badge>}
              <Badge
                variant={
                  user.role === 'admin' ? 'brand' : user.role === 'support' ? 'warning' : 'neutral'
                }
              >
                {user.role}
              </Badge>
            </div>
          </Link>
        ))}
      </Card>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} &middot; {data.total} users
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
