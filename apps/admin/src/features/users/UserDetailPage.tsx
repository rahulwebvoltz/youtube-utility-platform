import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card, useToast } from '@ytp/ui';
import { formatBytes } from '@ytp/utils';
import type { User } from '@ytp/types';
import { getUserDetail, setUserDisabled, updateUserRole } from '@/features/admin/admin.api.js';
import { useAuthStore } from '@/stores/auth-store.js';
import type { ApiClientError } from '@/lib/api-client.js';

const ROLES: User['role'][] = ['user', 'support', 'admin'];

function isUserRole(value: string): value is User['role'] {
  return (ROLES as string[]).includes(value);
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [role, setRole] = useState<User['role'] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => {
      if (!id) throw new Error('Missing user id');
      return getUserDetail(id);
    },
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const roleMutation = useMutation<User, ApiClientError, User['role']>({
    mutationFn: (newRole) => {
      if (!id) throw new Error('Missing user id');
      return updateUserRole(id, newRole);
    },
    onSuccess: () => {
      show({ title: 'Role updated', variant: 'success' });
      invalidate();
    },
    onError: (err) => {
      show({ title: 'Could not update role', description: err.message, variant: 'error' });
    },
  });

  const disableMutation = useMutation<User, ApiClientError, boolean>({
    mutationFn: (disabled) => {
      if (!id) throw new Error('Missing user id');
      return setUserDisabled(id, disabled);
    },
    onSuccess: (_, disabled) => {
      show({ title: disabled ? 'User disabled' : 'User re-enabled', variant: 'success' });
      invalidate();
    },
    onError: (err) => {
      show({ title: 'Could not update user', description: err.message, variant: 'error' });
    },
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading...</div>;
  }

  const { user, stats } = data;
  const isSelf = currentUser?.id === user.id;
  const canModify = currentUser?.role === 'admin' && !isSelf;
  const selectedRole = role ?? user.role;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/users"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={14} />
        Back to users
      </Link>

      <Card className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{user.name}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {user.isDisabled && <Badge variant="danger">Disabled</Badge>}
            <Badge
              variant={
                user.role === 'admin' ? 'brand' : user.role === 'support' ? 'warning' : 'neutral'
              }
            >
              {user.role}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 text-center">
          <div>
            <div className="text-lg font-semibold text-zinc-900">{stats.totalJobs}</div>
            <div className="text-xs text-zinc-500">Jobs</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-zinc-900">{stats.totalMediaFiles}</div>
            <div className="text-xs text-zinc-500">Files</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-zinc-900">
              {formatBytes(stats.totalStorageBytes)}
            </div>
            <div className="text-xs text-zinc-500">Storage</div>
          </div>
        </div>

        {isSelf && (
          <p className="border-t border-zinc-100 pt-4 text-xs text-zinc-400">
            You cannot modify your own account.
          </p>
        )}

        {canModify && (
          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <div className="flex items-center gap-2">
              <label htmlFor="role" className="text-sm font-medium text-zinc-700">
                Role
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isUserRole(value)) setRole(value);
                }}
                className="h-9 rounded-lg border border-zinc-200 px-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={selectedRole === user.role || roleMutation.isPending}
                onClick={() => {
                  roleMutation.mutate(selectedRole);
                }}
              >
                Save role
              </Button>
            </div>

            <div>
              {user.isDisabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disableMutation.isPending}
                  onClick={() => {
                    disableMutation.mutate(false);
                  }}
                >
                  Re-enable account
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={disableMutation.isPending}
                  onClick={() => {
                    if (
                      confirm(`Disable ${user.email}? This signs them out everywhere immediately.`)
                    ) {
                      disableMutation.mutate(true);
                    }
                  }}
                >
                  Disable account
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate(-1);
        }}
      >
        Go back
      </Button>
    </div>
  );
}
