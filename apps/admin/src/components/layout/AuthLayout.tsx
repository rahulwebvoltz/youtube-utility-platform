import { Outlet } from 'react-router-dom';
import { Card } from '@ytp/ui';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm p-6">
        <Outlet />
      </Card>
    </div>
  );
}
