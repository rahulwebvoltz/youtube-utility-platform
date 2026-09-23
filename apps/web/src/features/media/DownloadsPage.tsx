import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookmarkPlus, Download, Film, Music, Pause, Play } from 'lucide-react';
import { Button, Card, Skeleton } from '@ytp/ui';
import { formatBytes } from '@ytp/utils';
import { listMediaFiles, type MediaFileWithDownload } from '@/features/media/media.api.js';
import { SaveToCollectionDialog } from '@/features/collections/components/SaveToCollectionDialog.js';

const TYPE_ICONS = {
  audio: Music,
  video: Film,
} as const;

const TYPE_LABELS = {
  audio: 'Audio',
  video: 'Video',
} as const;

interface DownloadItemProps {
  file: MediaFileWithDownload;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

function DownloadItem({ file, isPlaying, onTogglePlay }: DownloadItemProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const isAudio = file.type === 'audio';
  const Icon = isAudio ? TYPE_ICONS.audio : TYPE_ICONS.video;
  const inlinePlaybackUrl = `${file.url}&disposition=inline`;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {file.thumbnail ? (
          <img src={file.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon size={18} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            {file.title ??
              `${file.format.toUpperCase()} ${isAudio ? TYPE_LABELS.audio : TYPE_LABELS.video}`}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-400">
            {file.format.toUpperCase()} &middot; {formatBytes(file.size)} &middot;{' '}
            {new Date(file.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTogglePlay}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              window.open(file.url, '_blank');
            }}
            aria-label="Download"
          >
            <Download size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSaveOpen(true);
            }}
            aria-label="Save to collection"
          >
            <BookmarkPlus size={16} />
          </Button>
        </div>
      </div>

      {isPlaying && (
        <div className="mt-4">
          {isAudio ? (
            <audio controls autoPlay src={inlinePlaybackUrl} className="w-full">
              <track kind="captions" />
            </audio>
          ) : (
            <video controls autoPlay src={inlinePlaybackUrl} className="w-full rounded-lg bg-black">
              <track kind="captions" />
            </video>
          )}
        </div>
      )}

      <SaveToCollectionDialog
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        itemType="media"
        refId={file.id}
      />
    </Card>
  );
}

export function DownloadsPage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { data: files, isLoading } = useQuery({
    queryKey: ['media-files'],
    queryFn: listMediaFiles,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900">Downloads</h1>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
          <Music size={32} />
          <p className="text-sm">No downloads yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <DownloadItem
              key={file.id}
              file={file}
              isPlaying={playingId === file.id}
              onTogglePlay={() => {
                setPlayingId((current) => (current === file.id ? null : file.id));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
