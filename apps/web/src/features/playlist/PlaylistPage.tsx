import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, ListVideo, Search } from 'lucide-react';
import { Button, Skeleton, useToast } from '@ytp/ui';
import { formatDuration } from '@ytp/utils';
import type { AudioFormat, AudioQuality, VideoFormat, VideoQuality } from '@ytp/types';
import { createPlaylistBatchJob, getPlaylist } from '@/features/playlist/playlist.api.js';
import { PlaylistItemRow } from '@/features/playlist/components/PlaylistItemRow.js';
import { MediaFormatSelector } from '@/features/media/components/MediaFormatSelector.js';
import { ExportDialog } from '@/features/export/components/ExportDialog.js';
import { createPlaylistManifestExport } from '@/features/export/export.api.js';

const MANIFEST_FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

function isManifestFormat(value: string): value is 'csv' | 'json' {
  return value === 'csv' || value === 'json';
}

type SortKey = 'position' | 'title' | 'duration';

function isSortKey(value: string): value is SortKey {
  return value === 'position' || value === 'title' || value === 'duration';
}

export function PlaylistPage() {
  const { youtubeId } = useParams<{ youtubeId: string }>();
  const navigate = useNavigate();
  const { show } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['playlist', youtubeId],
    queryFn: () => {
      if (!youtubeId) throw new Error('Missing playlist id');
      return getPlaylist(youtubeId);
    },
    enabled: Boolean(youtubeId),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [openDialog, setOpenDialog] = useState<'audio' | 'video' | 'export' | null>(null);
  const [creating, setCreating] = useState(false);

  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    const filtered = search.trim()
      ? items.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()))
      : items;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'duration') return a.duration - b.duration;
      return a.position - b.position;
    });
  }, [data, search, sortKey]);

  const toggleItem = (index: number, event: MouseEvent<HTMLLabelElement>) => {
    const item = visibleItems[index];
    if (!item) return;
    setSelected((current) => {
      const next = new Set(current);
      if (event.shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        for (let i = start; i <= end; i++) {
          const rangeItem = visibleItems[i];
          if (rangeItem) next.add(rangeItem.videoId);
        }
      } else if (next.has(item.videoId)) {
        next.delete(item.videoId);
      } else {
        next.add(item.videoId);
      }
      return next;
    });
    setLastClickedIndex(index);
  };

  const runBatchJob = async (
    request:
      | { operation: 'transcript' }
      | { operation: 'audio'; format: AudioFormat; quality: AudioQuality }
      | { operation: 'video'; format: VideoFormat; quality: VideoQuality },
  ) => {
    if (!youtubeId) return;
    setOpenDialog(null);
    setCreating(true);
    try {
      const { jobId } = await createPlaylistBatchJob({
        ...request,
        playlistId: youtubeId,
        videoIds: [...selected],
      });
      navigate(`/playlist-job/${jobId}`);
    } catch (err) {
      show({
        title: 'Could not start batch job',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setCreating(false);
    }
  };

  const handleManifestExport = async (format: string) => {
    if (!youtubeId || !isManifestFormat(format)) return;
    setOpenDialog(null);
    setCreating(true);
    try {
      const { jobId } = await createPlaylistManifestExport(youtubeId, format);
      navigate(`/media/${jobId}`);
    } catch (err) {
      show({
        title: 'Could not start export',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setCreating(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{data.playlist.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <ListVideo size={14} />
            {data.playlist.itemCount} videos
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatDuration(data.playlist.totalDuration)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelected(new Set(visibleItems.map((i) => i.videoId)));
          }}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelected(new Set());
          }}
        >
          Clear
        </Button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search..."
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={sortKey}
          onChange={(event) => {
            const value = event.target.value;
            if (isSortKey(value)) setSortKey(value);
          }}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-600 outline-none focus:border-brand-500"
        >
          <option value="position">Order</option>
          <option value="title">Title</option>
          <option value="duration">Duration</option>
        </select>
      </div>

      <div className="space-y-2">
        {visibleItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No videos match your search.</p>
        ) : (
          visibleItems.map((item, index) => (
            <PlaylistItemRow
              key={item.id}
              item={item}
              selected={selected.has(item.videoId)}
              onToggle={(event) => {
                toggleItem(index, event);
              }}
            />
          ))
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">Selected: {selected.size}</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || creating}
              onClick={() => {
                void runBatchJob({ operation: 'transcript' });
              }}
            >
              Transcript
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || creating}
              onClick={() => {
                setOpenDialog('audio');
              }}
            >
              Audio
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || creating}
              onClick={() => {
                setOpenDialog('video');
              }}
            >
              Video
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={creating}
              onClick={() => {
                setOpenDialog('export');
              }}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {(openDialog === 'audio' || openDialog === 'video') && (
        <MediaFormatSelector
          open
          initialTab={openDialog}
          showOtherTab={false}
          showSizeColumn={false}
          onClose={() => {
            setOpenDialog(null);
          }}
          onSelectAudio={(format, quality) => {
            void runBatchJob({ operation: 'audio', format, quality });
          }}
          onSelectVideo={(format, quality) => {
            void runBatchJob({ operation: 'video', format, quality });
          }}
        />
      )}

      <ExportDialog
        open={openDialog === 'export'}
        onClose={() => {
          setOpenDialog(null);
        }}
        title="Export Playlist"
        formats={MANIFEST_FORMATS}
        onSelect={(format) => {
          void handleManifestExport(format);
        }}
        busy={creating}
      />
    </div>
  );
}
