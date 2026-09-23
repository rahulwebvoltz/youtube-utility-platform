import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@ytp/ui';
import { getTranscript } from '@/features/transcript/transcript.api.js';
import { TranscriptViewer } from '@/features/transcript/components/TranscriptViewer.js';

export function TranscriptViewPage() {
  const { youtubeId } = useParams<{ youtubeId: string }>();
  const [searchParams] = useSearchParams();
  // Undefined (not a guessed "en") means "whichever language this video's
  // transcript actually is in" - the server resolves that, not this page.
  const language = searchParams.get('language') ?? undefined;
  const navigate = useNavigate();

  const {
    data: transcript,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transcript', youtubeId, language],
    queryFn: () => {
      if (!youtubeId) throw new Error('Missing YouTube id');
      return getTranscript(youtubeId, language);
    },
    enabled: Boolean(youtubeId),
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

  if (error || !transcript) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertCircle className="mx-auto text-red-500" size={32} />
        <p className="text-sm text-zinc-600">{error?.message ?? 'Transcript not found.'}</p>
        {backButton}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {backButton}
      <TranscriptViewer transcript={transcript} title={`youtube.com/watch?v=${youtubeId}`} />
    </div>
  );
}
