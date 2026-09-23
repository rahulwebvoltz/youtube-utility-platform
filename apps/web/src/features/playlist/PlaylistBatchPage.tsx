import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { Button, Card, useToast } from '@ytp/ui';
import { useChildJobsQuery, useJobQuery } from '@/features/jobs/useJobs.js';
import { JobProgressCard } from '@/features/jobs/components/JobProgressCard.js';
import { JobRow } from '@/features/history/components/JobRow.js';
import { ExportDialog } from '@/features/export/components/ExportDialog.js';
import {
  createCombinedTranscriptExport,
  createMediaBundleExport,
} from '@/features/export/export.api.js';

const ACTIVE_STATUSES = new Set(['queued', 'started', 'processing', 'uploading']);

const COMBINED_TRANSCRIPT_FORMATS = [
  { value: 'txt', label: 'TXT' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
];

function isCombinedTranscriptFormat(value: string): value is 'txt' | 'markdown' | 'json' {
  return value === 'txt' || value === 'markdown' || value === 'json';
}

export function PlaylistBatchPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const { data: job, isLoading } = useJobQuery(jobId);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const parentActive = job ? ACTIVE_STATUSES.has(job.status) : true;
  const { data: children } = useChildJobsQuery(jobId, parentActive);

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

  if (job.status === 'failed') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertCircle className="mx-auto text-red-500" size={32} />
        <p className="text-sm text-zinc-600">{job.error ?? 'Could not start the batch job.'}</p>
        {backButton}
      </div>
    );
  }

  const childItems = children?.items ?? [];
  const completedCount = childItems.filter((child) => child.status === 'completed').length;
  const failedCount = childItems.filter((child) => child.status === 'failed').length;
  const operation = (job.options as { operation?: string } | undefined)?.operation;
  const canExport = !parentActive && completedCount > 0;

  const handleCombinedTranscript = async (format: string) => {
    if (!isCombinedTranscriptFormat(format)) return;
    setExportDialogOpen(false);
    setExporting(true);
    try {
      const { jobId: exportJobId } = await createCombinedTranscriptExport(job.id, format);
      navigate(`/media/${exportJobId}`);
    } catch (err) {
      show({
        title: 'Could not start export',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setExporting(false);
    }
  };

  const handleMediaBundle = async () => {
    setExporting(true);
    try {
      const { jobId: exportJobId } = await createMediaBundleExport(job.id);
      navigate(`/media/${exportJobId}`);
    } catch (err) {
      show({
        title: 'Could not start export',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'error',
      });
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {backButton}

      {parentActive ? (
        <JobProgressCard job={job} />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Queued {childItems.length} video{childItems.length === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {completedCount} completed
              {failedCount > 0 ? ` · ${failedCount} failed` : ''} ·{' '}
              {childItems.length - completedCount - failedCount} in progress
            </p>
          </div>
          {canExport && operation === 'transcript' && (
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => {
                setExportDialogOpen(true);
              }}
            >
              <Download size={14} />
              Export Combined Transcript
            </Button>
          )}
          {canExport && (operation === 'audio' || operation === 'video') && (
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => {
                void handleMediaBundle();
              }}
            >
              <Download size={14} />
              Download All as ZIP
            </Button>
          )}
        </Card>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {childItems.map((child) => (
            <div key={child.id} className="space-y-1">
              <JobRow job={child} />
              {child.status === 'completed' && (
                <div className="pl-4">
                  <Link
                    to={
                      child.type === 'transcript' ? `/transcript/${child.id}` : `/media/${child.id}`
                    }
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    View result →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => {
          setExportDialogOpen(false);
        }}
        title="Export Combined Transcript"
        formats={COMBINED_TRANSCRIPT_FORMATS}
        onSelect={(format) => {
          void handleCombinedTranscript(format);
        }}
        busy={exporting}
      />
    </div>
  );
}
