import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@ytp/ui';
import { useJobQuery } from '@/features/jobs/useJobs.js';
import { JobProgressCard } from '@/features/jobs/components/JobProgressCard.js';
import { getFileDownload } from '@/features/media/media.api.js';
import { MediaDownloadCard } from '@/features/media/components/MediaDownloadCard.js';

export function MediaJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJobQuery(jobId);

  const mediaFileId = (job?.result as { mediaFileId?: string } | undefined)?.mediaFileId;
  const isDone = job?.status === 'completed';

  const { data: download, isLoading: downloadLoading } = useQuery({
    queryKey: ['file', mediaFileId],
    queryFn: () => {
      if (!mediaFileId) throw new Error('Missing media file id');
      return getFileDownload(mediaFileId);
    },
    enabled: isDone && Boolean(mediaFileId),
  });

  if (isLoading || !job) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading...</div>;
  }

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigate('/');
      }}
    >
      <ArrowLeft size={14} />
      Back to Analyze
    </Button>
  );

  if (job.status === 'failed' || job.status === 'cancelled') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertCircle className="mx-auto text-red-500" size={32} />
        <p className="text-sm text-zinc-600">
          {job.status === 'cancelled'
            ? 'This job was cancelled.'
            : (job.error ?? 'Processing failed.')}
        </p>
        {backButton}
      </div>
    );
  }

  if (!isDone || downloadLoading || !download || !mediaFileId) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16">
        <JobProgressCard job={job} />
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
