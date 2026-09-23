import { z } from 'zod';
import { loadEnv } from '@ytp/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Local filesystem storage - see @ytp/storage. Must be the same absolute
  // path the API is configured with, since both read/write it.
  STORAGE_ROOT: z.string().min(1),

  YTDLP_PATH: z.string().default('yt-dlp'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),

  // Optional - lets yt-dlp authenticate as a real logged-in browser session,
  // which YouTube trusts far more than an anonymous request. Needed once
  // YouTube starts responding with "Sign in to confirm you're not a bot" for
  // a given IP/client fingerprint. Set at most one of these:
  //   YTDLP_COOKIES_FROM_BROWSER=chrome   (or edge/firefox/brave/...)
  //   YTDLP_COOKIES_FILE=/absolute/path/to/cookies.txt
  YTDLP_COOKIES_FROM_BROWSER: z.string().optional(),
  YTDLP_COOKIES_FILE: z.string().optional(),

  // Optional - a directory to prepend to yt-dlp's PATH, for a JS runtime (e.g.
  // Deno) it needs to solve YouTube's "n" challenge. A freshly-installed
  // runtime's directory may not be on this process's own PATH yet (Windows
  // only broadcasts PATH updates to new login sessions, not already-running
  // ones) - setting it here works immediately, with no restart required.
  YTDLP_EXTRA_PATH: z.string().optional(),
});

export const env = loadEnv(envSchema);
export type Env = typeof env;
