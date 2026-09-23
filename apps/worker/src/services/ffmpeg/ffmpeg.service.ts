import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AudioFormat, AudioQuality, VideoFormat } from '@ytp/types';
import { env } from '@/config/env.js';

const execFileAsync = promisify(execFile);

const MAX_BUFFER_BYTES = 32 * 1024 * 1024;
const TRANSCODE_TIMEOUT_MS = 15 * 60_000;

async function runFFmpeg(args: string[]): Promise<void> {
  // Every argument here comes from a fixed whitelist keyed by validated
  // format/quality enums - never from raw user input.
  await execFileAsync(env.FFMPEG_PATH, ['-y', ...args], {
    timeout: TRANSCODE_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER_BYTES,
  });
}

const AUDIO_CODECS: Record<AudioFormat, string> = {
  mp3: 'libmp3lame',
  m4a: 'aac',
  wav: 'pcm_s16le',
  flac: 'flac',
};

// Bitrate only makes sense for lossy formats; wav/flac are always lossless.
const LOSSY_AUDIO_FORMATS = new Set<AudioFormat>(['mp3', 'm4a']);

export async function transcodeAudio(
  inputPath: string,
  outputPath: string,
  format: AudioFormat,
  quality: AudioQuality,
): Promise<void> {
  const args = ['-i', inputPath, '-vn', '-c:a', AUDIO_CODECS[format]];
  if (LOSSY_AUDIO_FORMATS.has(format)) {
    args.push('-b:a', `${quality}k`);
  }
  args.push(outputPath);
  await runFFmpeg(args);
}

/**
 * Remuxes (no re-encode) into the exact requested container. For mp4 this also
 * moves the moov atom to the front (`+faststart`) so the file can start
 * playing before it's fully downloaded.
 */
export async function remuxVideo(
  inputPath: string,
  outputPath: string,
  format: VideoFormat,
): Promise<void> {
  const args = ['-i', inputPath, '-c', 'copy'];
  if (format === 'mp4') {
    args.push('-movflags', '+faststart');
  }
  args.push(outputPath);
  await runFFmpeg(args);
}
