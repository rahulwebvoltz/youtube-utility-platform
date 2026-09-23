export type AudioFormat = 'mp3' | 'm4a' | 'wav' | 'flac';
export type AudioQuality = '128' | '192' | '256' | '320';

export type VideoFormat = 'mp4' | 'mkv' | 'webm';
export type VideoQuality = 'original' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';

export type MediaType = 'audio' | 'video' | 'export';

export interface MediaFileStorage {
  key: string;
}

export interface MediaFile {
  id: string;
  userId: string;
  jobId: string;
  type: MediaType;
  // An export's own format (csv/json/txt/markdown/zip) isn't Audio/VideoFormat
  // - the field just carries whatever format string that job produced. The
  // narrower members are technically redundant next to `string` but are kept
  // for documentation - they're what a MediaFile actually holds 99% of the time.
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  format: AudioFormat | VideoFormat | string;
  mimeType: string;
  size: number;
  storage: MediaFileStorage;
  createdAt: string;
}

export interface AudioJobOptions {
  videoId: string;
  format: AudioFormat;
  quality: AudioQuality;
}

export interface VideoJobOptions {
  videoId: string;
  format: VideoFormat;
  quality: VideoQuality;
}

/** A quality option's estimated download size for one specific video - `undefined` when yt-dlp didn't report a size for it. */
export interface VideoFormatEstimate {
  quality: VideoQuality;
  estimatedSizeBytes?: number | undefined;
}
