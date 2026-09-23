import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Plus } from 'lucide-react';
import { Button, Card, Dialog, Input, Skeleton, useToast } from '@ytp/ui';
import {
  useCollectionsQuery,
  useCreateCollectionMutation,
} from '@/features/collections/useCollections.js';

export function CollectionsPage() {
  const { data: collections, isLoading } = useCollectionsQuery();
  const createMutation = useCreateCollectionMutation();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) nameInputRef.current?.focus();
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({ name: name.trim() });
      setName('');
      setOpen(false);
    } catch (err) {
      show({
        title: 'Could not create collection',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Collections</h1>
        <Button
          size="sm"
          onClick={() => {
            setOpen(true);
          }}
        >
          <Plus size={14} />
          New Collection
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !collections || collections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
          <FolderOpen size={32} />
          <p className="text-sm">No collections yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link to={`/collections/${collection.id}`}>
                <Card interactive className="p-4">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="mt-1 truncate text-xs text-zinc-500">{collection.description}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">{collection.itemCount} items</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="New Collection"
      >
        <div className="space-y-3">
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Collection name"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCreate();
            }}
          />
          <Button
            className="w-full"
            onClick={() => {
              void handleCreate();
            }}
            disabled={!name.trim() || createMutation.isPending}
          >
            Create
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
