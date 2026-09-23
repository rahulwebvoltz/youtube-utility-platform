import type { AudioFormat, AudioQuality, VideoFormat, VideoQuality } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

interface CreateJobResponse {
  jobId: string;
  status: string;
}

export async function createAudioJob(
  youtubeId: string,
  format: AudioFormat,
  quality: AudioQuality,
): Promise<CreateJobResponse> {
  return apiFetch('/api/v1/media/audio', {
    method: 'POST',
    body: JSON.stringify({ videoId: youtubeId, format, quality }),
  });
}

export async function createVideoJob(
  youtubeId: string,
  format: VideoFormat,
  quality: VideoQuality,
): Promise<CreateJobResponse> {
  return apiFetch('/api/v1/media/video', {
    method: 'POST',
    body: JSON.stringify({ videoId: youtubeId, format, quality }),
  });
}

export interface FileDownload {
  url: string;
  format: string;
  mimeType: string;
  size: number;
}

export async function getFileDownload(mediaFileId: string): Promise<FileDownload> {
  return apiFetch<FileDownload>(`/api/v1/files/${mediaFileId}`);
}

export interface MediaFileWithDownload {
  id: string;
  type: 'audio' | 'video' | 'export';
  format: string;
  mimeType: string;
  size: number;
  createdAt: string;
  /** The source video's title, when its job recorded one. */
  title?: string | undefined;
  /** The source video's thumbnail URL, when its job recorded one. */
  thumbnail?: string | undefined;
  url: string;
}

export async function listMediaFiles(): Promise<MediaFileWithDownload[]> {
  return apiFetch<MediaFileWithDownload[]>('/api/v1/files');
}
