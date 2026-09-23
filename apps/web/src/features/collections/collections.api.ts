import type { Collection, CollectionItemType, CollectionItemWithDetails } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

export async function listCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>('/api/v1/collections');
}

export async function createCollection(name: string, description?: string): Promise<Collection> {
  return apiFetch<Collection>('/api/v1/collections', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export interface CollectionDetail {
  collection: Collection;
  items: CollectionItemWithDetails[];
}

export async function getCollection(id: string): Promise<CollectionDetail> {
  return apiFetch<CollectionDetail>(`/api/v1/collections/${id}`);
}

export async function updateCollection(
  id: string,
  patch: { name?: string; description?: string },
): Promise<Collection> {
  return apiFetch<Collection>(`/api/v1/collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await apiFetch(`/api/v1/collections/${id}`, { method: 'DELETE' });
}

export async function addItemToCollection(
  collectionId: string,
  itemType: CollectionItemType,
  refId: string,
): Promise<void> {
  await apiFetch(`/api/v1/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify({ itemType, refId }),
  });
}

export async function removeItemFromCollection(
  collectionId: string,
  itemId: string,
): Promise<void> {
  await apiFetch(`/api/v1/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' });
}
