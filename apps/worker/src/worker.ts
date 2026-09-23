import 'dotenv/config';
import { connectDatabase } from '@/database/mongoose.js';
import { logger } from '@/logger.js';
import { metadataWorker } from '@/workers/metadata.worker.js';
import { transcriptWorker } from '@/workers/transcript.worker.js';
import { audioWorker } from '@/workers/audio.worker.js';
import { videoWorker } from '@/workers/video.worker.js';
import { playlistWorker } from '@/workers/playlist.worker.js';
import { exportWorker } from '@/workers/export.worker.js';
import { startHeartbeat } from '@/services/heartbeat.service.js';

const workers = [
  metadataWorker,
  transcriptWorker,
  audioWorker,
  videoWorker,
  playlistWorker,
  exportWorker,
];

let stopHeartbeat: (() => Promise<void>) | undefined;

async function main(): Promise<void> {
  await connectDatabase();
  stopHeartbeat = startHeartbeat([
    'metadata',
    'transcript',
    'audio',
    'video',
    'playlist',
    'export',
  ]);
  logger.info(`Worker process started with ${workers.length} queue workers`);
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down workers...');
  await stopHeartbeat?.();
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start worker');
  process.exit(1);
});
