import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn, Button } from '@ytp/ui';
import { useAuthStore } from '@/stores/auth-store.js';
import { logoutAdmin } from '@/features/auth/auth.api.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/queues', label: 'Queues' },
  { to: '/workers', label: 'Workers' },
  { to: '/storage', label: 'Storage' },
  { to: '/audit-logs', label: 'Audit Logs' },
  { to: '/system', label: 'System' },
];

export function AdminShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-16 items-center px-4 text-lg font-bold text-zinc-900">Admin</div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100',
                  isActive && 'bg-brand-50 text-brand-700',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-zinc-200 p-3">
          <p className="truncate text-sm text-zinc-600">{user?.name}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              void handleLogout();
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
