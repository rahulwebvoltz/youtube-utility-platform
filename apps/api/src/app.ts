import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env.js';
import { apiV1Router } from '@/routes/index.js';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: [env.WEB_APP_URL, env.ADMIN_APP_URL],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1', apiV1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
