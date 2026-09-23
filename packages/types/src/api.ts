import type { VideoFormatEstimate } from './media.js';
import type { TranscriptLanguageOption } from './transcript.js';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type AnalyzerResultType = 'video' | 'playlist' | 'short' | 'unknown';

export interface AnalyzerResult {
  type: AnalyzerResultType;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration?: number;
  channelName?: string;
  itemCount?: number;
  /** Per-quality download size estimates - only populated for single-video results. */
  videoFormats?: VideoFormatEstimate[];
  /** Selectable caption languages - only populated for single-video results. */
  transcriptLanguages?: TranscriptLanguageOption[];
}
