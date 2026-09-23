import { fetchCaptionTrack, type CaptionTrack } from '@/services/youtube/youtube.service.js';
import { downloadCaptionFile } from '@/services/ytdlp/ytdlp.service.js';
import { parseJson3, type RawTranscriptSegment } from '@/services/transcript/json3-parser.js';

export interface ExtractedTranscript {
  language: string;
  source: CaptionTrack['source'];
  segments: RawTranscriptSegment[];
  plainText: string;
  wordCount: number;
}

export async function extractTranscript(
  youtubeId: string,
  preferredLanguage?: string,
): Promise<ExtractedTranscript | null> {
  const track = await fetchCaptionTrack(youtubeId, preferredLanguage);
  if (!track) return null;

  const raw = await downloadCaptionFile(youtubeId, track.language, track.source);
  const segments = parseJson3(raw);

  const plainText = segments.map((segment) => segment.text).join(' ');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return { language: track.language, source: track.source, segments, plainText, wordCount };
}
