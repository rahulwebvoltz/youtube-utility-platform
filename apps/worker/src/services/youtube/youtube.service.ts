import type { TranscriptLanguageOption, VideoFormatEstimate, VideoQuality } from '@ytp/types';
import { runYtDlpJson } from '@/services/ytdlp/ytdlp.service.js';
import { assertYoutubeId } from '@/services/youtube/youtube-id.js';

const MAX_PLAYLIST_ITEMS = 500;

interface YtDlpThumbnail {
  url: string;
}

interface YtDlpCaptionTrack {
  url: string;
  ext: string;
}

interface YtDlpFormat {
  format_id: string;
  height?: number | null;
  vcodec?: string;
  acodec?: string;
  filesize?: number | null;
  filesize_approx?: number | null;
}

interface YtDlpVideoJson {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: YtDlpThumbnail[];
  channel_id?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  upload_date?: string;
  view_count?: number;
  /** YouTube's own detected/declared primary language for the video, when known. */
  language?: string;
  subtitles?: Record<string, YtDlpCaptionTrack[]>;
  automatic_captions?: Record<string, YtDlpCaptionTrack[]>;
  formats?: YtDlpFormat[];
}

// Ordered highest to lowest - used both as the ladder to check availability
// against and as the batch/multi-video fallback when there's no per-video
// format data to check against (see estimateVideoFormats below).
const VIDEO_QUALITY_LADDER: { quality: VideoQuality; height: number }[] = [
  { quality: '2160p', height: 2160 },
  { quality: '1440p', height: 1440 },
  { quality: '1080p', height: 1080 },
  { quality: '720p', height: 720 },
  { quality: '480p', height: 480 },
  { quality: '360p', height: 360 },
];

function formatSize(format: YtDlpFormat): number | undefined {
  return format.filesize ?? format.filesize_approx ?? undefined;
}

function isVideoOnly(format: YtDlpFormat): boolean {
  return (
    Boolean(format.vcodec) &&
    format.vcodec !== 'none' &&
    (!format.acodec || format.acodec === 'none')
  );
}

function isAudioOnly(format: YtDlpFormat): boolean {
  return (
    (!format.vcodec || format.vcodec === 'none') &&
    Boolean(format.acodec) &&
    format.acodec !== 'none'
  );
}

/** Best video-only stream at or under the requested height - `undefined` cap means "tallest available" (original). */
function pickBestVideoOnly(formats: YtDlpFormat[], maxHeight?: number): YtDlpFormat | undefined {
  const candidates = formats.filter(
    (format) =>
      isVideoOnly(format) && (maxHeight === undefined || (format.height ?? 0) <= maxHeight),
  );
  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, format) => {
    const height = format.height ?? 0;
    const bestHeight = best.height ?? 0;
    if (height !== bestHeight) return height > bestHeight ? format : best;
    return (formatSize(format) ?? 0) > (formatSize(best) ?? 0) ? format : best;
  });
}

/** yt-dlp's `bestaudio` selector has no height/resolution notion - just the highest-size audio-only stream. */
function pickBestAudioOnly(formats: YtDlpFormat[]): YtDlpFormat | undefined {
  const candidates = formats.filter(isAudioOnly);
  if (candidates.length === 0) return undefined;

  return candidates.reduce((best, format) =>
    (formatSize(format) ?? 0) > (formatSize(best) ?? 0) ? format : best,
  );
}

/**
 * Mirrors `downloadVideoSource`'s `bestvideo[height<=N]+bestaudio` selection so the
 * estimate matches what a download at this quality would actually produce.
 */
function estimateVideoSize(formats: YtDlpFormat[], quality: VideoQuality): number | undefined {
  const maxHeight = quality === 'original' ? undefined : Number.parseInt(quality, 10);
  const video = pickBestVideoOnly(formats, maxHeight);
  if (!video) return undefined;

  const videoSize = formatSize(video);
  if (videoSize === undefined) return undefined;

  const audio = pickBestAudioOnly(formats);
  const audioSize = audio ? (formatSize(audio) ?? 0) : 0;
  return videoSize + audioSize;
}

/**
 * Only offers the quality tiers this specific video actually has - a video
 * capped at 480p shouldn't list a "1080p" row that silently falls back to the
 * same 480p file, and a genuine 4K upload should offer 2160p/1440p rows that
 * a fixed 1080p-max ladder never could.
 */
function estimateVideoFormats(formats: YtDlpFormat[] | undefined): VideoFormatEstimate[] {
  if (!formats || formats.length === 0) {
    // No per-video format data to check against (e.g. a batch/playlist
    // context checking many videos at once) - offer the full standard ladder.
    return VIDEO_QUALITY_LADDER.map(({ quality }) => ({ quality }));
  }

  const maxHeight = pickBestVideoOnly(formats)?.height ?? 0;
  const availableTiers = VIDEO_QUALITY_LADDER.filter(({ height }) => height <= maxHeight);
  // A video below even our lowest standard tier (e.g. an old 240p upload)
  // still gets one row, matching whatever its own best stream actually is.
  const tiers = availableTiers.length > 0 ? availableTiers : VIDEO_QUALITY_LADDER.slice(-1);

  return tiers.map(({ quality }) => ({
    quality,
    estimatedSizeBytes: estimateVideoSize(formats, quality),
  }));
}

interface YtDlpPlaylistEntry {
  id: string;
  title: string;
  thumbnails?: YtDlpThumbnail[];
  duration?: number;
}

interface YtDlpPlaylistJson {
  id?: string;
  title?: string;
  description?: string;
  thumbnails?: YtDlpThumbnail[];
  entries?: YtDlpPlaylistEntry[];
}

function bestThumbnail(thumbnails: YtDlpThumbnail[] | undefined): string {
  return thumbnails?.at(-1)?.url ?? '';
}

function parseUploadDate(value: string | undefined): Date | undefined {
  if (value?.length !== 8) return undefined;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`;
  return new Date(iso);
}

const ORIGINAL_SUFFIX = '-orig';

/**
 * YouTube's `automatic_captions` map contains one real ASR (speech-recognition)
 * track plus 100+ machine-translated copies of it into every other language -
 * translated entries are keyed by plain language codes ("en", "hi", "fr", ...),
 * while the one genuine, untranslated detection is marked with a "<lang>-orig"
 * key. That's the actual detected language; every other key is a guess made
 * *by YouTube's translator*, not the video's real language.
 */
function findOriginalAutoCaptionLanguage(
  automaticCaptions: Record<string, YtDlpCaptionTrack[]> | undefined,
): string | undefined {
  const originalKey = Object.keys(automaticCaptions ?? {}).find((key) =>
    key.endsWith(ORIGINAL_SUFFIX),
  );
  return originalKey?.slice(0, -ORIGINAL_SUFFIX.length);
}

/**
 * Every selectable caption language for this video - manual captions (real,
 * whichever language they're in) plus every auto-generated/translated
 * language, with exactly one marked `isOriginal`: the video's actual detected
 * language (manual, if any exists, else the "<lang>-orig" ASR track, else
 * yt-dlp's own `language` field) - never a guess.
 */
function buildTranscriptLanguages(info: YtDlpVideoJson): TranscriptLanguageOption[] {
  const manualLanguages = Object.keys(info.subtitles ?? {});
  const autoLanguages = Object.keys(info.automatic_captions ?? {}).filter(
    (key) => !key.endsWith(ORIGINAL_SUFFIX),
  );

  const originalLanguage =
    manualLanguages[0] ?? findOriginalAutoCaptionLanguage(info.automatic_captions) ?? info.language;

  const codes = [...new Set([...manualLanguages, ...autoLanguages])];
  return codes.map((code) => ({ code, isOriginal: code === originalLanguage }));
}

export interface VideoInfo {
  youtubeId: string;
  title: string;
  description?: string | undefined;
  thumbnail: string;
  channelId: string;
  channelName: string;
  duration: number;
  publishedAt?: Date | undefined;
  viewCount?: number | undefined;
  videoFormats: VideoFormatEstimate[];
  transcriptLanguages: TranscriptLanguageOption[];
}

export async function fetchVideoInfo(youtubeId: string): Promise<VideoInfo> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;

  const info = await runYtDlpJson<YtDlpVideoJson>([
    '-j',
    '--no-warnings',
    '--skip-download',
    '--no-playlist',
    url,
  ]);

  return {
    youtubeId: info.id,
    title: info.title,
    description: info.description,
    thumbnail: info.thumbnail ?? bestThumbnail(info.thumbnails),
    channelId: info.channel_id ?? '',
    channelName: info.channel ?? info.uploader ?? '',
    duration: info.duration ?? 0,
    publishedAt: parseUploadDate(info.upload_date),
    viewCount: info.view_count,
    videoFormats: estimateVideoFormats(info.formats),
    transcriptLanguages: buildTranscriptLanguages(info),
  };
}

export interface CaptionTrack {
  language: string;
  /** "youtube_captions" for a manually-created track, "asr" for auto-generated. */
  source: 'youtube_captions' | 'asr';
}

function trackFor(
  tracksByLanguage: Record<string, YtDlpCaptionTrack[]> | undefined,
  language: string,
  source: CaptionTrack['source'],
): CaptionTrack | null {
  const tracks = tracksByLanguage?.[language];
  if (!tracks) return null;

  // json3 is YouTube's own direct timedtext format - unlike its "vtt" entry for
  // auto-captions, it is never wrapped in an HLS manifest, so its existence here
  // confirms yt-dlp can actually produce a json3 payload for this language/source.
  const track = tracks.find((t) => t.ext === 'json3');
  return track ? { language, source } : null;
}

function firstAvailableTrack(
  tracksByLanguage: Record<string, YtDlpCaptionTrack[]> | undefined,
  source: CaptionTrack['source'],
): CaptionTrack | null {
  const firstLanguage = Object.keys(tracksByLanguage ?? {})[0];
  return firstLanguage ? trackFor(tracksByLanguage, firstLanguage, source) : null;
}

/**
 * With an explicit `preferredLanguage`, tries manual captions in that language
 * first, then auto-generated, then whatever's available at all (manual-first).
 *
 * Without one, this never defaults to a guessed language (e.g. "en"): manual
 * captions are real regardless of which language they're in, so any available
 * one is used as-is; for auto-generated captions, the video's actual detected
 * language is read from YouTube's own "<lang>-orig" marker (falling back to
 * yt-dlp's own `language` field, then to whatever's available) rather than
 * assuming a specific language and hoping it exists.
 */
export async function fetchCaptionTrack(
  youtubeId: string,
  preferredLanguage?: string,
): Promise<CaptionTrack | null> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;

  const info = await runYtDlpJson<YtDlpVideoJson>([
    '-j',
    '--no-warnings',
    '--skip-download',
    '--no-playlist',
    url,
  ]);

  if (preferredLanguage) {
    return (
      trackFor(info.subtitles, preferredLanguage, 'youtube_captions') ??
      trackFor(info.automatic_captions, preferredLanguage, 'asr') ??
      firstAvailableTrack(info.subtitles, 'youtube_captions') ??
      firstAvailableTrack(info.automatic_captions, 'asr')
    );
  }

  const manual = firstAvailableTrack(info.subtitles, 'youtube_captions');
  if (manual) return manual;

  const detectedLanguage =
    findOriginalAutoCaptionLanguage(info.automatic_captions) ?? info.language;
  const detected = detectedLanguage
    ? trackFor(info.automatic_captions, detectedLanguage, 'asr')
    : null;
  return detected ?? firstAvailableTrack(info.automatic_captions, 'asr');
}

export interface PlaylistItemInfo {
  videoId: string;
  position: number;
  title: string;
  thumbnail: string;
  duration: number;
}

export interface PlaylistInfo {
  youtubeId: string;
  title: string;
  description?: string | undefined;
  thumbnail: string;
  totalDuration: number;
  items: PlaylistItemInfo[];
}

export async function fetchPlaylistInfo(youtubeId: string): Promise<PlaylistInfo> {
  assertYoutubeId(youtubeId);
  const url = `https://www.youtube.com/playlist?list=${youtubeId}`;

  const info = await runYtDlpJson<YtDlpPlaylistJson>([
    '--no-warnings',
    '--flat-playlist',
    '--dump-single-json',
    '--playlist-end',
    String(MAX_PLAYLIST_ITEMS),
    url,
  ]);

  const items: PlaylistItemInfo[] = (info.entries ?? []).map((entry, index) => ({
    videoId: entry.id,
    position: index,
    title: entry.title,
    thumbnail: bestThumbnail(entry.thumbnails),
    duration: entry.duration ?? 0,
  }));

  return {
    youtubeId: info.id ?? youtubeId,
    title: info.title ?? 'Untitled playlist',
    description: info.description,
    thumbnail: items[0]?.thumbnail ?? bestThumbnail(info.thumbnails),
    totalDuration: items.reduce((sum, item) => sum + item.duration, 0),
    items,
  };
}
