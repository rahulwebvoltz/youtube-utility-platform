export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string | undefined;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CollectionItemType = 'video' | 'playlist' | 'transcript' | 'media';

export interface CollectionItem {
  id: string;
  collectionId: string;
  itemType: CollectionItemType;
  refId: string;
  addedAt: string;
}

/** A CollectionItem with the referenced Video/Playlist/Transcript/MediaFile's
 * display fields resolved, for rendering the collection's item list. */
export interface CollectionItemWithDetails extends CollectionItem {
  title: string;
  thumbnail?: string | undefined;
  subtitle?: string | undefined;
  /** The underlying video's YouTube id, when resolvable - lets the frontend
   * link straight to the video/transcript without a second lookup. */
  youtubeId?: string | undefined;
}
