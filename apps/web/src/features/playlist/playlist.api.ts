import type {
  AudioFormat,
  AudioQuality,
  Playlist,
  PlaylistItem,
  VideoFormat,
  VideoQuality,
} from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

export interface PlaylistDetail {
  playlist: Playlist;
  items: PlaylistItem[];
}

export async function getPlaylist(youtubeId: string): Promise<PlaylistDetail> {
  return apiFetch<PlaylistDetail>(`/api/v1/playlists/${youtubeId}`);
}

interface CreateBatchJobResponse {
  jobId: string;
  status: string;
}

export type PlaylistBatchRequest =
  | { operation: 'transcript'; playlistId: string; videoIds: string[]; language?: string }
  | {
      operation: 'audio';
      playlistId: string;
      videoIds: string[];
      format: AudioFormat;
      quality: AudioQuality;
    }
  | {
      operation: 'video';
      playlistId: string;
      videoIds: string[];
      format: VideoFormat;
      quality: VideoQuality;
    };

export async function createPlaylistBatchJob(
  request: PlaylistBatchRequest,
): Promise<CreateBatchJobResponse> {
  return apiFetch('/api/v1/playlists/jobs', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
