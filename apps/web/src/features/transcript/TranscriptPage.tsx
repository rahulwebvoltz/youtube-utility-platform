import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@ytp/ui';
import { useJobQuery } from '@/features/jobs/useJobs.js';
import { JobProgressCard } from '@/features/jobs/components/JobProgressCard.js';
import { getTranscript } from '@/features/transcript/transcript.api.js';
import { TranscriptViewer } from '@/features/transcript/components/TranscriptViewer.js';

export function TranscriptPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading: jobLoading } = useJobQuery(jobId);

  const youtubeId = job?.source.videoId;
  // Once the job is done, its result carries the real detected language; leave
  // it undefined beforehand rather than guessing "en" while still in progress.
  const language = (job?.result as { language?: string } | undefined)?.language;
  const isDone = job?.status === 'completed';

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ['transcript', youtubeId, language],
    queryFn: () => {
      if (!youtubeId) throw new Error('Missing YouTube id');
      return getTranscript(youtubeId, language);
    },
    enabled: isDone && Boolean(youtubeId),
  });

  if (jobLoading || !job) {
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
            : (job.error ?? 'Transcript extraction failed.')}
        </p>
        {backButton}
      </div>
    );
  }

  if (!isDone || transcriptLoading || !transcript) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16">
        <JobProgressCard job={job} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backButton}
      <TranscriptViewer
        transcript={transcript}
        title={youtubeId ? `Transcript - youtube.com/watch?v=${youtubeId}` : 'Transcript'}
      />
    </div>
  );
}
