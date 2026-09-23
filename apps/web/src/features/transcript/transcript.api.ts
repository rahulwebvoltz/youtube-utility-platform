import type { Transcript } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

// `language` is intentionally optional and left out of the request when
// omitted - the server auto-detects the video's real caption language rather
// than guessing "en".
export async function createTranscriptJob(
  youtubeId: string,
  language?: string,
): Promise<{ jobId: string; status: string }> {
  return apiFetch('/api/v1/transcripts', {
    method: 'POST',
    body: JSON.stringify({ videoId: youtubeId, language }),
  });
}

export async function getTranscript(youtubeId: string, language?: string): Promise<Transcript> {
  const query = language ? `?language=${encodeURIComponent(language)}` : '';
  return apiFetch<Transcript>(`/api/v1/transcripts/${youtubeId}${query}`);
}
