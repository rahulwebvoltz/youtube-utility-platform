import { motion } from 'framer-motion';
import { Download, FileText, HardDrive, History, ListVideo } from 'lucide-react';
import { Card } from '@ytp/ui';

const FEATURES = [
  {
    icon: FileText,
    title: 'Transcript extraction',
    description:
      'Pull full, accurate transcripts from any video - ready to read, search, or reuse.',
  },
  {
    icon: Download,
    title: 'Video & audio downloads',
    description: 'Choose your quality and format, then download video or audio-only files.',
  },
  {
    icon: ListVideo,
    title: 'Playlist batch processing',
    description: 'Point at a playlist and process every video in it without repeating the work.',
  },
  {
    icon: History,
    title: 'History & collections',
    description: 'Every job you run is saved automatically - organize your favorites afterward.',
  },
  {
    icon: HardDrive,
    title: 'Local, permanent storage',
    description: 'Files are stored on our own servers, so your download links never expire.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function FeaturesSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={container}
      className="w-full max-w-5xl"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Everything you need, in one place
        </h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-500">
          Built for creators, researchers, and teams who work with YouTube content every day.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <motion.div key={title} variants={item}>
            <Card interactive className="h-full p-6 text-left">
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
