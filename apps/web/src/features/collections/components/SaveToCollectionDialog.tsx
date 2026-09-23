import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Dialog, Input, useToast } from '@ytp/ui';
import type { CollectionItemType } from '@ytp/types';
import {
  useAddItemMutation,
  useCreateCollectionMutation,
  useCollectionsQuery,
} from '@/features/collections/useCollections.js';
import { ApiClientError } from '@/lib/api-client.js';

interface SaveToCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  itemType: CollectionItemType;
  refId: string;
}

export function SaveToCollectionDialog({
  open,
  onClose,
  itemType,
  refId,
}: SaveToCollectionDialogProps) {
  const { data: collections, isLoading } = useCollectionsQuery();
  const createMutation = useCreateCollectionMutation();
  const addItemMutation = useAddItemMutation();
  const { show } = useToast();
  const [newName, setNewName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingNew) newNameInputRef.current?.focus();
  }, [creatingNew]);

  const handleSaveToExisting = async (collectionId: string) => {
    try {
      await addItemMutation.mutateAsync({ collectionId, itemType, refId });
      show({ title: 'Saved to collection', variant: 'success' });
      onClose();
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : undefined;
      const message = err instanceof Error ? err.message : 'Could not save';
      show({
        title: code === 'ALREADY_SAVED' ? 'Already saved to this collection' : 'Could not save',
        description: code === 'ALREADY_SAVED' ? undefined : message,
        variant: code === 'ALREADY_SAVED' ? 'default' : 'error',
      });
    }
  };

  const handleCreateAndSave = async () => {
    if (!newName.trim()) return;
    try {
      const collection = await createMutation.mutateAsync({ name: newName.trim() });
      await addItemMutation.mutateAsync({ collectionId: collection.id, itemType, refId });
      show({ title: 'Saved to new collection', variant: 'success' });
      setNewName('');
      setCreatingNew(false);
      onClose();
    } catch (err) {
      show({
        title: 'Could not create collection',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Save to Collection">
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : collections && collections.length > 0 ? (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => {
                  void handleSaveToExisting(collection.id);
                }}
                disabled={addItemMutation.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
              >
                <span className="text-zinc-800">{collection.name}</span>
                <span className="text-xs text-zinc-400">{collection.itemCount} items</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No collections yet.</p>
        )}

        {creatingNew ? (
          <div className="flex gap-2">
            <Input
              ref={newNameInputRef}
              value={newName}
              onChange={(event) => {
                setNewName(event.target.value);
              }}
              placeholder="Collection name"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleCreateAndSave();
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                void handleCreateAndSave();
              }}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setCreatingNew(true);
            }}
          >
            <Plus size={14} />
            New Collection
          </Button>
        )}
      </div>
    </Dialog>
  );
}
