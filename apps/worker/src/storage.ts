import { StorageService } from '@ytp/storage';
import { env } from '@/config/env.js';

export const storageService = new StorageService({ rootDir: env.STORAGE_ROOT });
