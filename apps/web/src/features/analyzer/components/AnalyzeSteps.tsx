import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@ytp/ui';

const STEPS = ['Validating URL', 'Fetching metadata', 'Preparing preview'];

export function AnalyzeSteps({ activeStep }: { activeStep: number }) {
  return (
    <div className="space-y-3 py-2">
      {STEPS.map((step, index) => {
        const done = index < activeStep;
        const active = index === activeStep;
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
            className="flex items-center gap-2.5 text-sm"
          >
            {done ? (
              <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
            ) : active ? (
              <Loader2 className="shrink-0 animate-spin text-brand-600" size={18} />
            ) : (
              <Circle className="shrink-0 text-zinc-300" size={18} />
            )}
            <span
              className={cn(
                done && 'text-zinc-400',
                active && 'font-medium text-zinc-900',
                !done && !active && 'text-zinc-400',
              )}
            >
              {step}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
