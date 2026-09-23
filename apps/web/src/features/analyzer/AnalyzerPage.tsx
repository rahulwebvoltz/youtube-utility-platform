import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, FileText, ListVideo, Music, Video } from 'lucide-react';
import { URLInput, Button, Card, cn } from '@ytp/ui';
import type { AnalyzerResult } from '@ytp/types';
import { analyzeUrl } from '@/features/analyzer/analyzer.api.js';
import { AnalyzeSteps } from '@/features/analyzer/components/AnalyzeSteps.js';
import { AnalyzerResultCard } from '@/features/analyzer/components/AnalyzerResultCard.js';
import { BackgroundBlobs } from '@/features/analyzer/components/BackgroundBlobs.js';
import { HowItWorksSection } from '@/features/analyzer/components/HowItWorksSection.js';
import { FeaturesSection } from '@/features/analyzer/components/FeaturesSection.js';
import { CtaSection } from '@/features/analyzer/components/CtaSection.js';

type AnalyzeStatus = 'idle' | 'loading' | 'success' | 'error';

const TOOLS = [
  { label: 'Video', icon: Video },
  { label: 'Playlist', icon: ListVideo },
  { label: 'Transcript', icon: FileText },
  { label: 'Media', icon: Music },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AnalyzerPage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<AnalyzeStatus>('idle');
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim() || status === 'loading') return;

    setStatus('loading');
    setError(null);
    setActiveStep(0);

    await sleep(300);
    setActiveStep(1);

    try {
      const data = await analyzeUrl(url.trim());
      setActiveStep(2);
      await sleep(300);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setUrl('');
  };

  return (
    <div className="relative flex flex-col items-center gap-10 py-8 text-center">
      <BackgroundBlobs />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        <motion.h1
          variants={item}
          className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl"
        >
          Process{' '}
          <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-transparent">
            YouTube Content
          </span>
        </motion.h1>
        <motion.p variants={item} className="mx-auto max-w-xl text-zinc-500">
          Extract transcripts, process audio &amp; video, and manage your content - all from a
          single link.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full max-w-xl"
      >
        <div className={cn('flex gap-2', status === 'error' && 'animate-shake')}>
          <URLInput
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            onSubmitUrl={() => {
              void handleAnalyze();
            }}
            disabled={status === 'loading'}
            className="flex-1"
          />
          <Button
            size="lg"
            onClick={() => {
              void handleAnalyze();
            }}
            disabled={status === 'loading' || !url.trim()}
          >
            Analyze
            <ArrowRight size={16} />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="mt-4 p-4 text-left">
                <AnalyzeSteps activeStep={activeStep} />
              </Card>
            </motion.div>
          )}

          {status === 'error' && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="wait">
        {status === 'success' && result ? (
          <motion.div key="result" className="w-full max-w-xl">
            <AnalyzerResultCard result={result} onReset={handleReset} />
          </motion.div>
        ) : (
          <motion.div
            key="tools"
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {TOOLS.map(({ label, icon: Icon }) => (
              <motion.div key={label} variants={item}>
                <Card
                  interactive
                  className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-700"
                >
                  <Icon size={16} className="text-brand-600" />
                  {label}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {status !== 'success' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-6 text-sm text-zinc-400"
        >
          <span>✓ Fast processing</span>
          <span>✓ Batch processing</span>
          <span>✓ Export</span>
        </motion.div>
      )}

      <div className="flex w-full flex-col items-center gap-16 border-t border-zinc-100 pt-16">
        <HowItWorksSection />
        <FeaturesSection />
        <CtaSection />
      </div>
    </div>
  );
}
