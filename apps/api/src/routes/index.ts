import { Router } from 'express';
import { analyzerRouter } from '@/modules/analyzer/analyzer.routes.js';
import { authRouter } from '@/modules/auth/auth.routes.js';
import { usersRouter } from '@/modules/users/users.routes.js';
import { playlistsRouter } from '@/modules/playlists/playlists.routes.js';
import { transcriptsRouter } from '@/modules/transcripts/transcripts.routes.js';
import { mediaRouter } from '@/modules/media/media.routes.js';
import { filesRouter } from '@/modules/files/files.routes.js';
import { jobsRouter } from '@/modules/jobs/jobs.routes.js';
import { exportsRouter } from '@/modules/exports/exports.routes.js';
import { collectionsRouter } from '@/modules/collections/collections.routes.js';
import { adminRouter } from '@/modules/admin/admin.routes.js';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/analyzer', analyzerRouter);
apiV1Router.use('/playlists', playlistsRouter);
apiV1Router.use('/transcripts', transcriptsRouter);
apiV1Router.use('/media', mediaRouter);
apiV1Router.use('/files', filesRouter);
apiV1Router.use('/jobs', jobsRouter);
apiV1Router.use('/exports', exportsRouter);
apiV1Router.use('/collections', collectionsRouter);
apiV1Router.use('/admin', adminRouter);
