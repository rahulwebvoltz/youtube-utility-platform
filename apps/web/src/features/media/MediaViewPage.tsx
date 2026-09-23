import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@ytp/ui';
import { getFileDownload } from '@/features/media/media.api.js';
import { MediaDownloadCard } from '@/features/media/components/MediaDownloadCard.js';

export function MediaViewPage() {
  const { mediaFileId } = useParams<{ mediaFileId: string }>();
  const navigate = useNavigate();

  const {
    data: download,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['file', mediaFileId],
    queryFn: () => {
      if (!mediaFileId) throw new Error('Missing media file id');
      return getFileDownload(mediaFileId);
    },
    enabled: Boolean(mediaFileId),
    retry: false,
  });

  const backButton = (
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
  );

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading...</div>;
  }

  if (error || !download || !mediaFileId) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertCircle className="mx-auto text-red-500" size={32} />
        <p className="text-sm text-zinc-600">
          {error?.message ?? 'This file is no longer available - it may have expired.'}
        </p>
        {backButton}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-16">
      {backButton}
      <MediaDownloadCard download={download} mediaFileId={mediaFileId} />
    </div>
  );
}
