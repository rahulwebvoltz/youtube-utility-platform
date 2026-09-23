export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export type TranscriptSource = 'youtube_captions' | 'asr';

export type TranscriptExportFormat = 'txt' | 'srt' | 'vtt' | 'json' | 'markdown';

export interface Transcript {
  id: string;
  videoId: string;
  language: string;
  source: TranscriptSource;
  segments: TranscriptSegment[];
  plainText: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

/** One selectable caption language for a video - `isOriginal` marks the one auto-detected as the video's real (non-translated) language. */
export interface TranscriptLanguageOption {
  code: string;
  isOriginal: boolean;
}
