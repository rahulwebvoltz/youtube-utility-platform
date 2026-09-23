export interface Playlist {
  id: string;
  youtubeId: string;
  title: string;
  description?: string;
  thumbnail: string;
  itemCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  videoId: string;
  position: number;
  title: string;
  thumbnail: string;
  duration: number;
}
