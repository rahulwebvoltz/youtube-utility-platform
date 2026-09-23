import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectionItemType } from '@ytp/types';
import {
  addItemToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeItemFromCollection,
  updateCollection,
} from '@/features/collections/collections.api.js';

export const COLLECTIONS_QUERY_KEY = ['collections'] as const;

export function useCollectionsQuery() {
  return useQuery({
    queryKey: COLLECTIONS_QUERY_KEY,
    queryFn: listCollections,
  });
}

export function useCollectionQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => {
      if (!id) throw new Error('Missing collection id');
      return getCollection(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createCollection(name, description),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
  });
}

export function useUpdateCollectionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; description?: string }) => updateCollection(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['collection', id] });
    },
  });
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
    },
  });
}

export function useAddItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      itemType,
      refId,
    }: {
      collectionId: string;
      itemType: CollectionItemType;
      refId: string;
    }) => addItemToCollection(collectionId, itemType, refId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
    },
  });
}

export function useRemoveItemMutation(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeItemFromCollection(collectionId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
    },
  });
}
