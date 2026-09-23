import { motion } from 'framer-motion';
import { Download, Link2, Search } from 'lucide-react';
import { Card } from '@ytp/ui';

const STEPS = [
  {
    icon: Link2,
    title: 'Paste a link',
    description: 'Drop in any YouTube video or playlist URL - public or unlisted.',
  },
  {
    icon: Search,
    title: 'We analyze it',
    description: 'We fetch the title, thumbnail, duration, and available formats in seconds.',
  },
  {
    icon: Download,
    title: 'Get what you need',
    description: 'Pull the transcript, download audio or video, or export everything at once.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function HowItWorksSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={container}
      className="w-full max-w-4xl"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">How it works</h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-500">
          From a link to a finished file, in three simple steps.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <motion.div key={title} variants={item}>
            <Card className="relative h-full p-6 text-left">
              <span className="absolute right-5 top-5 text-4xl font-bold text-zinc-100">
                {index + 1}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{description}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
