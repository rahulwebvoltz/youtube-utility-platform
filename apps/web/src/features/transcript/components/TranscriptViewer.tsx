import { useMemo, useState } from 'react';
import { BookmarkPlus, Copy, Search } from 'lucide-react';
import type { Transcript } from '@ytp/types';
import { Badge, Button, useToast } from '@ytp/ui';
import { ExportMenu } from '@/features/transcript/components/ExportMenu.js';
import { SaveToCollectionDialog } from '@/features/collections/components/SaveToCollectionDialog.js';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface TranscriptViewerProps {
  transcript: Transcript;
  title: string;
}

export function TranscriptViewer({ transcript, title }: TranscriptViewerProps) {
  const [query, setQuery] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const { show } = useToast();

  const filteredSegments = useMemo(() => {
    if (!query.trim()) return transcript.segments;
    const needle = query.toLowerCase();
    return transcript.segments.filter((segment) => segment.text.toLowerCase().includes(needle));
  }, [transcript.segments, query]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript.plainText);
    show({ title: 'Copied to clipboard', variant: 'success' });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <Badge variant="neutral">{transcript.language.toUpperCase()}</Badge>
            <span>{transcript.wordCount} words</span>
            <span>&middot;</span>
            <span>{transcript.segments.length} segments</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleCopy();
            }}
          >
            <Copy size={14} />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaveOpen(true);
            }}
          >
            <BookmarkPlus size={14} />
            Save
          </Button>
          <ExportMenu transcript={transcript} title={title} />
        </div>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Search transcript..."
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4">
        {filteredSegments.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No matching segments.</p>
        ) : (
          filteredSegments.map((segment, index) => (
            <div key={`${segment.start}-${index}`} className="flex gap-3 text-sm">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-400">
                {formatTime(segment.start)}
              </span>
              <p className="text-zinc-700">{segment.text}</p>
            </div>
          ))
        )}
      </div>

      <SaveToCollectionDialog
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        itemType="transcript"
        refId={transcript.id}
      />
    </div>
  );
}
