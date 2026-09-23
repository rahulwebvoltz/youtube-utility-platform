import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@ytp/ui';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <Card className="p-6">
          <Outlet />
        </Card>
      </motion.div>
    </div>
  );
}
