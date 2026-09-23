import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminShell } from '@/components/layout/AdminShell.js';
import { AuthLayout } from '@/components/layout/AuthLayout.js';
import { RequireAuth } from '@/components/auth/RequireAuth.js';
import { LoginPage } from '@/features/auth/LoginPage.js';
import { DashboardPage } from '@/features/dashboard/DashboardPage.js';
import { UsersPage } from '@/features/users/UsersPage.js';
import { UserDetailPage } from '@/features/users/UserDetailPage.js';
import { JobsPage } from '@/features/jobs/JobsPage.js';
import { QueuesPage } from '@/features/queues/QueuesPage.js';
import { WorkersPage } from '@/features/workers/WorkersPage.js';
import { StoragePage } from '@/features/storage/StoragePage.js';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage.js';
import { SystemPage } from '@/features/system/SystemPage.js';

const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AdminShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/:id', element: <UserDetailPage /> },
          { path: 'jobs', element: <JobsPage /> },
          { path: 'queues', element: <QueuesPage /> },
          { path: 'workers', element: <WorkersPage /> },
          { path: 'storage', element: <StoragePage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
          { path: 'system', element: <SystemPage /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: 'login', element: <LoginPage /> }],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
