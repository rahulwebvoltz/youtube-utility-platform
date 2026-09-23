import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { VideoQuality } from '@ytp/types';
import { env } from '@/config/env.js';
import { assertYoutubeId } from '@/services/youtube/youtube-id.js';

const execFileAsync = promisify(execFile);

// Prepends YTDLP_EXTRA_PATH (e.g. a freshly-installed Deno's directory) to the
// child process's PATH, so yt-dlp can find it even if this worker process's
// own PATH is stale - see the env var's own comment for why that happens.
function ytdlpEnv(): NodeJS.ProcessEnv {
  if (!env.YTDLP_EXTRA_PATH) return process.env;
  return {
    ...process.env,
    PATH: [env.YTDLP_EXTRA_PATH, process.env['PATH']].filter(Boolean).join(path.delimiter),
  };
}

const MAX_BUFFER_BYTES = 32 * 1024 * 1024;
const INFO_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 15 * 60_000;

// yt-dlp rewrites its own progress line in place with '\r', e.g.
// "[download]  45.2% of 3.27MiB at 1.11MiB/s ETA 00:02" - never '\n' until done.
const DOWNLOAD_PERCENT_PATTERN = /\[download]\s+([\d.]+)%/;
// Only push an update on a whole-percent change, and no more than 4x/second -
// yt-dlp itself repaints this line dozens of times a second on a fast link.
const PROGRESS_THROTTLE_MS = 250;

// A backward jump this large means yt-dlp has started downloading a new
// segment (see `segments` below), not that the current one went backward.
const SEGMENT_RESET_THRESHOLD = 20;

/**
 * Runs yt-dlp as a live child process (not execFile's buffer-then-return)
 * so its own download percentage can be parsed as it streams and forwarded to
 * `onProgress`, instead of the caller sitting at one static checkpoint for
 * however long the actual download takes.
 *
 * `segments` is the number of separate files yt-dlp will download for this
 * request - e.g. a "bestvideo+bestaudio" format downloads the video and audio
 * streams as two separate files, each with its own independent 0-100% cycle.
 * Left at the default of 1, `onProgress` receives yt-dlp's own percentage
 * as-is; at 2+, each new segment's 0% restart is detected and folded into one
 * continuous 0-100 curve instead of visibly resetting partway through.
 */
function spawnYtDlpDownload(
  args: string[],
  onProgress?: (percent: number) => void,
  segments = 1,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(env.YTDLP_PATH, args, { env: ytdlpEnv() });

    let settled = false;
    let segmentIndex = 0;
    let lastRawPercent = -1;
    let lastEmittedPercent = -1;
    let lastEmitAt = 0;
    let stderrTail = '';

    const timer = setTimeout(() => {
      finish(() => {
        child.kill();
        reject(new Error(`yt-dlp timed out after ${DOWNLOAD_TIMEOUT_MS}ms`));
      });
    }, DOWNLOAD_TIMEOUT_MS);

    function finish(fn: () => void): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    }

    function handleChunk(chunk: Buffer): void {
      for (const line of chunk.toString('utf-8').split(/\r?\n/)) {
        const match = DOWNLOAD_PERCENT_PATTERN.exec(line);
        if (!match?.[1]) continue;

        const rawPercent = Math.round(Number.parseFloat(match[1]));
        if (rawPercent < lastRawPercent - SEGMENT_RESET_THRESHOLD && segmentIndex < segments - 1) {
          segmentIndex += 1;
        }
        lastRawPercent = rawPercent;

        const percent = Math.min(
          100,
          Math.round(((segmentIndex + rawPercent / 100) / segments) * 100),
        );
        const now = Date.now();
        if (percent === lastEmittedPercent) continue;
        if (percent < 100 && now - lastEmitAt < PROGRESS_THROTTLE_MS) continue;

        lastEmittedPercent = percent;
        lastEmitAt = now;
        onProgress?.(percent);
      }
    }

    child.stdout.on('data', handleChunk);
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stderrTail = (stderrTail + text).slice(-4000);
      handleChunk(chunk);
    });

    child.on('error', (err) => {
      finish(() => {
        reject(err);
      });
    });
    child.on('close', (code) => {
      finish(() => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with code ${String(code)}: ${stderrTail}`));
      });
    });
  });
}

/**
 * Lets yt-dlp authenticate as a real logged-in browser session - YouTube trusts
 * that far more than an anonymous request, which is what triggers its "Sign in
 * to confirm you're not a bot" block once a given IP/client fingerprint gets
 * flagged. No-op (returns []) unless one of the two env vars is configured.
 */
function cookieArgs(): string[] {
  if (env.YTDLP_COOKIES_FILE) return ['--cookies', env.YTDLP_COOKIES_FILE];
  if (env.YTDLP_COOKIES_FROM_BROWSER) {
    return ['--cookies-from-browser', env.YTDLP_COOKIES_FROM_BROWSER];
  }
  return [];
}

// YouTube now forces "SABR" streaming for the web client unless yt-dlp can solve
// its JS "n" challenge, which requires downloading yt-dlp's own solver script
// (cached after the first run) - without this, extraction fails outright with
// "The page needs to be reloaded." See https://github.com/yt-dlp/yt-dlp/wiki/EJS
const JS_CHALLENGE_ARGS = ['--remote-components', 'ejs:github'];

// yt-dlp options are never derived from raw user input - callers pass a fixed,
// whitelisted argument list built from validated ids only.
export async function runYtDlpJson<T>(args: string[]): Promise<T> {
  const { stdout } = await execFileAsync(
    env.YTDLP_PATH,
    [...cookieArgs(), ...JS_CHALLENGE_ARGS, ...args],
    {
      maxBuffer: MAX_BUFFER_BYTES,
      timeout: INFO_TIMEOUT_MS,
      env: ytdlpEnv(),
    },
  );
  // Generic JSON-parsing helper - the caller-specified T is exactly the contract
  // this function exists to provide; there's no tighter runtime type to check against.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
  return JSON.parse(stdout) as T;
}

/** Creates a scratch directory for one job's downloaded/transcoded files and always removes it afterward. */
export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SOURCE_BASENAME = 'source';

// yt-dlp normally merges video+audio into a single output file - but if it
// can't (e.g. ffmpeg unavailable to it), it silently leaves both source
// streams on disk instead. Picking the largest match rather than just the
// first one found means we still get the real (merged, or at least the
// video+audio-bearing) file rather than an arbitrary single-stream leftover.
async function findDownloadedFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const matches = files.filter((file) => file.startsWith(`${SOURCE_BASENAME}.`));
  if (matches.length === 0) {
    throw new Error('yt-dlp did not produce an output file');
  }

  const sized = await Promise.all(
    matches.map(async (file) => {
      const filePath = path.join(dir, file);
      const { size } = await stat(filePath);
      return { filePath, size };
    }),
  );

  return sized.reduce((largest, current) => (current.size > largest.size ? current : largest))
    .filePath;
}

function ffmpegLocationArgs(): string[] {
  return ['--ffmpeg-location', path.dirname(env.FFMPEG_PATH)];
}

/** Downloads the best available audio-only stream, in whatever native container yt-dlp picks. */
export async function downloadAudioSource(
  youtubeId: string,
  dir: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const outputTemplate = path.join(dir, `${SOURCE_BASENAME}.%(ext)s`);

  await spawnYtDlpDownload(
    [
      ...cookieArgs(),
      ...JS_CHALLENGE_ARGS,
      '-f',
      'bestaudio/best',
      '--no-warnings',
      '--no-playlist',
      '--newline',
      ...ffmpegLocationArgs(),
      '-o',
      outputTemplate,
      url,
    ],
    onProgress,
  );

  return findDownloadedFile(dir);
}

/**
 * Downloads one subtitle/caption track via yt-dlp itself rather than a raw
 * fetch to YouTube's timedtext URL - a bare fetch() reliably gets 429'd by
 * YouTube's caption CDN (it doesn't look like a browser or yt-dlp's own
 * request), while yt-dlp's own downloader handles it the same way it handles
 * every other YouTube request.
 */
export async function downloadCaptionFile(
  youtubeId: string,
  language: string,
  source: 'youtube_captions' | 'asr',
): Promise<string> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;

  return withTempDir('caption-', async (dir) => {
    const outputTemplate = path.join(dir, 'caption');

    await execFileAsync(
      env.YTDLP_PATH,
      [
        ...cookieArgs(),
        ...JS_CHALLENGE_ARGS,
        source === 'asr' ? '--write-auto-subs' : '--write-subs',
        '--sub-langs',
        language,
        '--sub-format',
        'json3',
        '--skip-download',
        '--no-warnings',
        '--no-playlist',
        '-o',
        outputTemplate,
        url,
      ],
      { timeout: INFO_TIMEOUT_MS, maxBuffer: MAX_BUFFER_BYTES, env: ytdlpEnv() },
    );

    const files = await readdir(dir);
    const match = files.find((file) => file.startsWith('caption'));
    if (!match) {
      throw new Error('yt-dlp did not produce a caption file');
    }
    return readFile(path.join(dir, match), 'utf-8');
  });
}

const VIDEO_QUALITY_FILTERS: Record<VideoQuality, string> = {
  original: '',
  '2160p': '[height<=2160]',
  '1440p': '[height<=1440]',
  '1080p': '[height<=1080]',
  '720p': '[height<=720]',
  '480p': '[height<=480]',
  '360p': '[height<=360]',
};

/**
 * Downloads best video+audio at or below the requested resolution, merged by
 * yt-dlp into whichever container fits the codecs - the worker's own FFmpeg
 * pass afterward remuxes into the exact format the user asked for.
 */
export async function downloadVideoSource(
  youtubeId: string,
  quality: VideoQuality,
  dir: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const filter = VIDEO_QUALITY_FILTERS[quality];
  const format = `bestvideo${filter}+bestaudio/best${filter}`;
  const outputTemplate = path.join(dir, `${SOURCE_BASENAME}.%(ext)s`);

  await spawnYtDlpDownload(
    [
      ...cookieArgs(),
      ...JS_CHALLENGE_ARGS,
      '-f',
      format,
      '--no-warnings',
      '--no-playlist',
      '--newline',
      ...ffmpegLocationArgs(),
      '-o',
      outputTemplate,
      url,
    ],
    onProgress,
    // "bestvideo+bestaudio" downloads video and audio as two separate files.
    2,
  );

  return findDownloadedFile(dir);
}
