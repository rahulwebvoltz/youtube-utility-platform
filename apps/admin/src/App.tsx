import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@ytp/ui';
import { queryClient } from '@/lib/query-client.js';
import { AppRouter } from '@/routes/AppRouter.js';
import { bootstrapSession } from '@/features/auth/auth.api.js';

export function App() {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </QueryClientProvider>
  );
}
