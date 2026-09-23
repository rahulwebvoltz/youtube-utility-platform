import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, ListVideo, Music, Trash2, Video, X } from 'lucide-react';
import type { CollectionItemType } from '@ytp/types';
import { Badge, Button, Card, Skeleton, useToast } from '@ytp/ui';
import {
  useCollectionQuery,
  useDeleteCollectionMutation,
  useRemoveItemMutation,
} from '@/features/collections/useCollections.js';

const TYPE_ICONS: Record<CollectionItemType, typeof Video> = {
  video: Video,
  playlist: ListVideo,
  transcript: FileText,
  media: Music,
};

const TYPE_LABELS: Record<CollectionItemType, string> = {
  video: 'Video',
  playlist: 'Playlist',
  transcript: 'Transcript',
  media: 'Media',
};

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const { data, isLoading } = useCollectionQuery(id);
  const removeItemMutation = useRemoveItemMutation(id ?? '');
  const deleteCollectionMutation = useDeleteCollectionMutation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId, {
      onError: () => {
        show({ title: 'Could not remove item', variant: 'error' });
      },
    });
  };

  const handleDeleteCollection = async () => {
    if (!id) return;
    try {
      await deleteCollectionMutation.mutateAsync(id);
      navigate('/collections');
    } catch (err) {
      show({
        title: 'Could not delete collection',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  const itemHref = (item: {
    itemType: CollectionItemType;
    refId: string;
    youtubeId?: string | undefined;
    id: string;
  }) => {
    switch (item.itemType) {
      case 'playlist':
        return { to: `/playlist/${item.refId}` };
      case 'transcript':
        return item.youtubeId ? { to: `/transcript/video/${item.youtubeId}` } : undefined;
      case 'media':
        return { to: `/media/file/${item.refId}` };
      case 'video':
        return { href: `https://www.youtube.com/watch?v=${item.refId}` };
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate('/collections');
        }}
      >
        <ArrowLeft size={14} />
        Back to Collections
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{data.collection.name}</h1>
          {data.collection.description && (
            <p className="mt-1 text-sm text-zinc-500">{data.collection.description}</p>
          )}
          <p className="mt-1 text-xs text-zinc-400">{data.collection.itemCount} items</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConfirmingDelete(true);
          }}
        >
          <Trash2 size={14} />
          Delete Collection
        </Button>
      </div>

      {confirmingDelete && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Delete this collection and all its saved items?</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirmingDelete(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                void handleDeleteCollection();
              }}
              disabled={deleteCollectionMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </Card>
      )}

      {data.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          Nothing saved here yet. Use the Save button on a video, transcript, or download.
        </p>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => {
            const Icon = TYPE_ICONS[item.itemType];
            const link = itemHref(item);

            const content = (
              <Card interactive={Boolean(link)} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon size={16} />
                </div>
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="hidden h-10 w-16 shrink-0 rounded object-cover sm:block"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-zinc-400">
                    <Badge variant="neutral" className="shrink-0">
                      {TYPE_LABELS[item.itemType]}
                    </Badge>
                    {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.preventDefault();
                    handleRemoveItem(item.id);
                  }}
                  aria-label="Remove from collection"
                >
                  <X size={14} />
                </Button>
              </Card>
            );

            if (!link) return <div key={item.id}>{content}</div>;
            if ('href' in link) {
              return (
                <a
                  key={item.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {content}
                </a>
              );
            }
            return (
              <Link key={item.id} to={link.to} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
