import {
  CollectionModel,
  CollectionItemModel,
  VideoModel,
  PlaylistModel,
  TranscriptModel,
  MediaFileModel,
  JobModel,
  type CollectionDocument,
  type CollectionItemDocument,
} from '@ytp/db';
import type { CollectionItemType, CollectionItemWithDetails } from '@ytp/types';
import { ApiError } from '@/middleware/errorHandler.js';

export function toPublicCollection(collection: CollectionDocument) {
  return {
    id: collection._id.toString(),
    userId: collection.userId.toString(),
    name: collection.name,
    description: collection.description,
    itemCount: collection.itemCount,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string,
): Promise<CollectionDocument> {
  return CollectionModel.create({ userId, name, description, itemCount: 0 });
}

export async function listCollectionsForUser(userId: string): Promise<CollectionDocument[]> {
  return CollectionModel.find({ userId }).sort({ createdAt: -1 });
}

export async function getCollectionForUser(
  collectionId: string,
  userId: string,
): Promise<CollectionDocument> {
  const collection = await CollectionModel.findOne({ _id: collectionId, userId });
  if (!collection) {
    throw new ApiError(404, 'NOT_FOUND', 'Collection not found');
  }
  return collection;
}

export async function updateCollectionForUser(
  collectionId: string,
  userId: string,
  patch: { name?: string | undefined; description?: string | undefined },
): Promise<CollectionDocument> {
  const collection = await getCollectionForUser(collectionId, userId);
  if (patch.name !== undefined) collection.name = patch.name;
  if (patch.description !== undefined) collection.description = patch.description;
  await collection.save();
  return collection;
}

export async function deleteCollectionForUser(collectionId: string, userId: string): Promise<void> {
  const collection = await getCollectionForUser(collectionId, userId);
  await CollectionItemModel.deleteMany({ collectionId: collection._id });
  await collection.deleteOne();
}

async function assertItemExists(
  itemType: CollectionItemType,
  refId: string,
  userId: string,
): Promise<void> {
  // Video/Playlist/Transcript are shared, globally-analyzed content (no owner
  // to check); MediaFile is user-specific, so ownership is verified there.
  if (itemType === 'video') {
    if (!(await VideoModel.exists({ youtubeId: refId }))) {
      throw new ApiError(404, 'NOT_FOUND', 'Video not found');
    }
  } else if (itemType === 'playlist') {
    if (!(await PlaylistModel.exists({ youtubeId: refId }))) {
      throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
    }
  } else if (itemType === 'transcript') {
    if (!(await TranscriptModel.exists({ _id: refId }))) {
      throw new ApiError(404, 'NOT_FOUND', 'Transcript not found');
    }
  } else {
    if (!(await MediaFileModel.exists({ _id: refId, userId }))) {
      throw new ApiError(404, 'NOT_FOUND', 'Media file not found');
    }
  }
}

export async function addItemToCollection(
  collectionId: string,
  userId: string,
  itemType: CollectionItemType,
  refId: string,
): Promise<CollectionItemDocument> {
  const collection = await getCollectionForUser(collectionId, userId);
  await assertItemExists(itemType, refId, userId);

  let item: CollectionItemDocument;
  try {
    item = await CollectionItemModel.create({ collectionId: collection._id, itemType, refId });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      throw new ApiError(409, 'ALREADY_SAVED', 'This item is already in the collection');
    }
    throw err;
  }

  collection.itemCount += 1;
  await collection.save();
  return item;
}

export async function removeItemFromCollection(
  collectionId: string,
  userId: string,
  itemId: string,
): Promise<void> {
  const collection = await getCollectionForUser(collectionId, userId);
  const removed = await CollectionItemModel.findOneAndDelete({
    _id: itemId,
    collectionId: collection._id,
  });
  if (!removed) {
    throw new ApiError(404, 'NOT_FOUND', 'Item not found in this collection');
  }
  collection.itemCount = Math.max(0, collection.itemCount - 1);
  await collection.save();
}

async function resolveItemDetails(
  item: CollectionItemDocument,
): Promise<CollectionItemWithDetails | null> {
  const base = {
    id: item._id.toString(),
    collectionId: item.collectionId.toString(),
    itemType: item.itemType,
    refId: item.refId,
    addedAt: item.createdAt.toISOString(),
  };

  if (item.itemType === 'video') {
    const video = await VideoModel.findOne({ youtubeId: item.refId });
    if (!video) return null;
    return {
      ...base,
      title: video.metadata.title,
      thumbnail: video.metadata.thumbnail,
      subtitle: video.metadata.channelName || undefined,
      youtubeId: video.youtubeId,
    };
  }

  if (item.itemType === 'playlist') {
    const playlist = await PlaylistModel.findOne({ youtubeId: item.refId });
    if (!playlist) return null;
    return {
      ...base,
      title: playlist.title,
      thumbnail: playlist.thumbnail,
      subtitle: `${playlist.itemCount} videos`,
      youtubeId: playlist.youtubeId,
    };
  }

  if (item.itemType === 'transcript') {
    const transcript = await TranscriptModel.findById(item.refId);
    if (!transcript) return null;
    const video = await VideoModel.findById(transcript.videoId);
    return {
      ...base,
      title: video?.metadata.title ?? 'Transcript',
      thumbnail: video?.metadata.thumbnail,
      subtitle: `${transcript.wordCount} words · ${transcript.language.toUpperCase()}`,
      youtubeId: video?.youtubeId,
    };
  }

  const mediaFile = await MediaFileModel.findById(item.refId);
  if (!mediaFile) return null;
  const job = await JobModel.findById(mediaFile.jobId);
  const youtubeId = job?.source.videoId;
  const video = youtubeId ? await VideoModel.findOne({ youtubeId }) : null;
  return {
    ...base,
    title: video?.metadata.title ?? `${mediaFile.type} file`,
    thumbnail: video?.metadata.thumbnail,
    subtitle: `${mediaFile.format.toUpperCase()} · ${mediaFile.type}`,
    youtubeId: youtubeId ?? undefined,
  };
}

export async function listItemsWithDetails(
  collectionId: string,
  userId: string,
): Promise<CollectionItemWithDetails[]> {
  await getCollectionForUser(collectionId, userId);
  const items = await CollectionItemModel.find({ collectionId }).sort({ createdAt: -1 });

  const resolved = await Promise.all(items.map(resolveItemDetails));
  return resolved.filter((entry): entry is CollectionItemWithDetails => entry !== null);
}
