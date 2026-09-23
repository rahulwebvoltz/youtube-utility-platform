import { z } from 'zod';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

export function extractYoutubeId(url: string): {
  videoId?: string | undefined;
  playlistId?: string | undefined;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {};
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return {};

  const playlistId = parsed.searchParams.get('list') ?? undefined;

  if (host === 'youtu.be') {
    // `||` (not `??`) is deliberate: an empty path segment should also become undefined.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const videoId = parsed.pathname.slice(1).split('/')[0] || undefined;
    return { videoId, playlistId };
  }

  if (parsed.pathname === '/watch') {
    const videoId = parsed.searchParams.get('v') ?? undefined;
    return { videoId, playlistId };
  }

  if (parsed.pathname.startsWith('/shorts/')) {
    const videoId = parsed.pathname.split('/')[2];
    return { videoId, playlistId };
  }

  if (parsed.pathname === '/playlist') {
    return { playlistId };
  }

  return { playlistId };
}

export const youtubeUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .refine((url) => {
    const { videoId, playlistId } = extractYoutubeId(url);
    return Boolean(videoId ?? playlistId);
  }, 'Must be a valid YouTube video or playlist URL');

export const analyzerRequestSchema = z.object({
  url: youtubeUrlSchema,
});

export type AnalyzerRequestInput = z.infer<typeof analyzerRequestSchema>;
