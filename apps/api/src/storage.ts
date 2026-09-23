import { StorageService } from '@ytp/storage';
import { env } from '@/config/env.js';

export const storageService = new StorageService({
  rootDir: env.STORAGE_ROOT,
  publicBaseUrl: `${env.API_PUBLIC_URL}/api/v1/files/raw`,
  signingSecret: env.STORAGE_SIGNING_SECRET,
});
