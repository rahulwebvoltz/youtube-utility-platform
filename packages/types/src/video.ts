export type ProcessingStatus = 'not_started' | 'processing' | 'completed' | 'failed';

export interface VideoMetadata {
  title: string;
  description?: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  duration: number;
  publishedAt: string;
  viewCount?: number;
}

export interface Video {
  id: string;
  youtubeId: string;
  url: string;
  metadata: VideoMetadata;
  transcriptStatus: ProcessingStatus;
  mediaStatus: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
}
