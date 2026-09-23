import { useState } from 'react';
import { BookmarkPlus, Download as DownloadIcon } from 'lucide-react';
import { Button, Card } from '@ytp/ui';
import { formatBytes } from '@ytp/utils';
import { SaveToCollectionDialog } from '@/features/collections/components/SaveToCollectionDialog.js';
import type { FileDownload } from '@/features/media/media.api.js';

interface MediaDownloadCardProps {
  download: FileDownload;
  mediaFileId: string;
}

export function MediaDownloadCard({ download, mediaFileId }: MediaDownloadCardProps) {
  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <>
      <Card className="p-6 text-center">
        <DownloadIcon className="mx-auto mb-3 text-brand-600" size={28} />
        <p className="text-sm font-medium text-zinc-900">{download.format.toUpperCase()} ready</p>
        <p className="mt-1 text-xs text-zinc-500">{formatBytes(download.size)}</p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => window.open(download.url, '_blank')}>
            <DownloadIcon size={14} />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSaveOpen(true);
            }}
            aria-label="Save to collection"
          >
            <BookmarkPlus size={14} />
          </Button>
        </div>
      </Card>
      <SaveToCollectionDialog
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        itemType="media"
        refId={mediaFileId}
      />
    </>
  );
}
