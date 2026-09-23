import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookmarkPlus,
  Clock,
  ListVideo,
  RotateCcw,
  Text,
  UserRound,
} from 'lucide-react';
import type {
  AnalyzerResult,
  AudioFormat,
  AudioQuality,
  VideoFormat,
  VideoQuality,
} from '@ytp/types';
import { Badge, Button, Card, Spinner, useToast } from '@ytp/ui';
import { formatDuration, formatLanguageName } from '@ytp/utils';
import { useAuthStore } from '@/stores/auth-store.js';
import { createTranscriptJob } from '@/features/transcript/transcript.api.js';
import { createAudioJob, createVideoJob, getFileDownload } from '@/features/media/media.api.js';
import { MediaFormatPicker } from '@/features/media/components/MediaFormatSelector.js';
import { MediaDownloadCard } from '@/features/media/components/MediaDownloadCard.js';
import { SaveToCollectionDialog } from '@/features/collections/components/SaveToCollectionDialog.js';
import { useJobQuery } from '@/features/jobs/useJobs.js';
import { JobProgressCard } from '@/features/jobs/components/JobProgressCard.js';

interface AnalyzerResultCardProps {
  result: AnalyzerResult;
  onReset: () => void;
}

export function AnalyzerResultCard({ result, onReset }: AnalyzerResultCardProps) {
  const { show } = useToast();
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const [creatingTranscript, setCreatingTranscript] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | undefined>(undefined);
  const isPlaylist = result.type === 'playlist';

  const { data: activeJob } = useJobQuery(activeJobId);
  const activeJobFailed = activeJob?.status === 'failed' || activeJob?.status === 'cancelled';
  const activeJobDone = activeJob?.status === 'completed';
  const activeMediaFileId = (activeJob?.result as { mediaFileId?: string } | undefined)
    ?.mediaFileId;

  const { data: activeDownload } = useQuery({
    queryKey: ['file', activeMediaFileId],
    queryFn: () => {
      if (!activeMediaFileId) throw new Error('Missing media file id');
      return getFileDownload(activeMediaFileId);
    },
    enabled: activeJobDone && Boolean(activeMediaFileId),
  });

  const resetActiveJob = () => {
    setActiveJobId(undefined);
  };

  const transcriptLanguages = result.transcriptLanguages ?? [];
  const originalLanguage = transcriptLanguages.find((l) => l.isOriginal)?.code;
  const [transcriptLanguage, setTranscriptLanguage] = useState<string | undefined>(
    originalLanguage ?? transcriptLanguages[0]?.code,
  );
  const sortedTranscriptLanguages = [...transcriptLanguages].sort((a, b) => {
    if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1;
    return formatLanguageName(a.code).localeCompare(formatLanguageName(b.code));
  });

  const handleSaveClick = () => {
    if (!requireAuthOrRedirect()) return;
    setSaveOpen(true);
  };

  const requireAuthOrRedirect = (): boolean => {
    if (authStatus === 'authenticated') return true;
    show({ title: 'Sign in required', description: 'Create an account to process this video.' });
    navigate('/login', { state: { from: '/' } });
    return false;
  };

  const handleTranscriptClick = async () => {
    if (!requireAuthOrRedirect()) return;

    setCreatingTranscript(true);
    try {
      const { jobId } = await createTranscriptJob(result.youtubeId, transcriptLanguage);
      navigate(`/transcript/${jobId}`);
    } catch (err) {
      show({
        title: 'Could not start transcript',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setCreatingTranscript(false);
    }
  };

  const handleAudioSubmit = async (format: AudioFormat, quality: AudioQuality) => {
    if (!requireAuthOrRedirect()) return;

    try {
      const { jobId } = await createAudioJob(result.youtubeId, format, quality);
      setActiveJobId(jobId);
    } catch (err) {
      show({
        title: 'Could not start audio job',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  const handleVideoSubmit = async (format: VideoFormat, quality: VideoQuality) => {
    if (!requireAuthOrRedirect()) return;

    try {
      const { jobId } = await createVideoJob(result.youtubeId, format, quality);
      setActiveJobId(jobId);
    } catch (err) {
      show({
        title: 'Could not start video job',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
    }
  };

  const handleViewPlaylist = () => {
    if (!requireAuthOrRedirect()) return;
    navigate(`/playlist/${result.youtubeId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden">
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative aspect-video w-full overflow-hidden bg-zinc-100"
          >
            {result.thumbnail ? (
              <img
                src={result.thumbnail}
                alt={result.title}
                className="h-full w-full object-cover"
              />
            ) : null}

            <Badge
              variant="brand"
              className="absolute bottom-2 left-2 shadow-sm ring-1 ring-inset ring-white/20"
            >
              {isPlaylist ? 'Playlist' : 'Video'}
            </Badge>

            {typeof result.duration === 'number' && (
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                <Clock size={12} />
                {formatDuration(result.duration)}
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveClick}
              aria-label="Save to collection"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md ring-1 ring-black/5 transition-all hover:scale-105 hover:bg-brand-50 hover:text-brand-600"
            >
              <BookmarkPlus size={17} />
            </button>
          </motion.div>

          <div className="flex flex-col gap-1.5 p-5">
            <h3 className="line-clamp-2 text-left text-lg font-bold leading-snug text-zinc-900">
              {result.title}
            </h3>

            {result.channelName && (
              <p className="flex items-center gap-1.5 text-sm text-zinc-600">
                <UserRound size={14} className="text-zinc-400" />
                <span className="font-medium">{result.channelName}</span>
              </p>
            )}

            {typeof result.itemCount === 'number' && (
              <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                <ListVideo size={14} className="text-zinc-400" />
                {result.itemCount} videos
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-100 p-4">
          {isPlaylist ? (
            <Button className="w-full" onClick={handleViewPlaylist}>
              <ListVideo size={14} />
              View Playlist
            </Button>
          ) : activeJobId ? (
            <div className="space-y-3">
              {activeJobFailed ? (
                <div className="space-y-3 py-4 text-center">
                  <AlertCircle className="mx-auto text-red-500" size={28} />
                  <p className="text-sm text-zinc-600">
                    {activeJob.status === 'cancelled'
                      ? 'This job was cancelled.'
                      : (activeJob.error ?? 'Processing failed.')}
                  </p>
                  <Button variant="outline" size="sm" onClick={resetActiveJob}>
                    <RotateCcw size={14} />
                    Try again
                  </Button>
                </div>
              ) : activeJobDone && activeDownload && activeMediaFileId ? (
                <>
                  <MediaDownloadCard download={activeDownload} mediaFileId={activeMediaFileId} />
                  <Button variant="ghost" size="sm" className="w-full" onClick={resetActiveJob}>
                    <RotateCcw size={14} />
                    Choose another format
                  </Button>
                </>
              ) : activeJob ? (
                <JobProgressCard job={activeJob} />
              ) : (
                <p className="flex items-center justify-center gap-1.5 py-6 text-xs text-zinc-400">
                  <Spinner size={12} />
                  Starting your job...
                </p>
              )}
            </div>
          ) : (
            <MediaFormatPicker
              duration={result.duration}
              videoFormats={result.videoFormats}
              onSelectAudio={(format, quality) => {
                void handleAudioSubmit(format, quality);
              }}
              onSelectVideo={(format, quality) => {
                void handleVideoSubmit(format, quality);
              }}
              otherTabLabel="Transcript"
              otherTabIcon={Text}
              otherTab={
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Text size={28} className="text-zinc-400" />
                  <p className="text-sm text-zinc-500">
                    Get a searchable transcript of this video.
                  </p>

                  {sortedTranscriptLanguages.length > 1 && (
                    <label className="flex items-center gap-2 text-sm text-zinc-600">
                      Language
                      <select
                        value={transcriptLanguage}
                        onChange={(event) => {
                          setTranscriptLanguage(event.target.value);
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      >
                        {sortedTranscriptLanguages.map((option) => (
                          <option key={option.code} value={option.code}>
                            {formatLanguageName(option.code)}
                            {option.isOriginal ? ' (detected)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <Button
                    onClick={() => {
                      void handleTranscriptClick();
                    }}
                    disabled={creatingTranscript}
                  >
                    {creatingTranscript ? <Spinner size={14} /> : <Text size={14} />}
                    Get Transcript
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </Card>

      <div className="mt-3 flex justify-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw size={14} />
          Analyze another URL
        </Button>
      </div>

      <SaveToCollectionDialog
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        itemType={isPlaylist ? 'playlist' : 'video'}
        refId={result.youtubeId}
      />
    </motion.div>
  );
}
