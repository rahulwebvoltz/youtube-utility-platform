import 'dotenv/config';
import { createServer } from 'node:http';
import { env } from '@/config/env.js';
import { logger } from '@/logger.js';
import { createApp } from '@/app.js';
import { connectDatabase } from '@/database/mongoose.js';
import { createSocketServer } from '@/websocket/socket.js';
import { setIO } from '@/websocket/io.js';

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  setIO(await createSocketServer(httpServer));

  httpServer.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start API');
  process.exit(1);
});
