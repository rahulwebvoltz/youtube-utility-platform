import type { CombinedTranscriptFormat, PlaylistManifestFormat } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

interface CreateExportJobResponse {
  jobId: string;
  status: string;
}

export async function createPlaylistManifestExport(
  playlistId: string,
  format: PlaylistManifestFormat,
): Promise<CreateExportJobResponse> {
  return apiFetch('/api/v1/exports', {
    method: 'POST',
    body: JSON.stringify({ exportKind: 'playlist-manifest', playlistId, format }),
  });
}

export async function createCombinedTranscriptExport(
  playlistJobId: string,
  format: CombinedTranscriptFormat,
): Promise<CreateExportJobResponse> {
  return apiFetch('/api/v1/exports', {
    method: 'POST',
    body: JSON.stringify({ exportKind: 'combined-transcript', playlistJobId, format }),
  });
}

export async function createMediaBundleExport(
  playlistJobId: string,
): Promise<CreateExportJobResponse> {
  return apiFetch('/api/v1/exports', {
    method: 'POST',
    body: JSON.stringify({ exportKind: 'media-bundle', playlistJobId, format: 'zip' }),
  });
}
