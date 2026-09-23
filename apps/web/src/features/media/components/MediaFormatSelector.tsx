import { useState, type ReactNode } from 'react';
import { Download, Film, Music, MoreHorizontal } from 'lucide-react';
import { Button, Dialog, cn } from '@ytp/ui';
import { formatBytes } from '@ytp/utils';
import type {
  AudioFormat,
  AudioQuality,
  VideoFormat,
  VideoFormatEstimate,
  VideoQuality,
} from '@ytp/types';

const AUDIO_FORMATS: AudioFormat[] = ['mp3', 'm4a', 'wav', 'flac'];
const AUDIO_QUALITIES: AudioQuality[] = ['320', '256', '192', '128'];
const VIDEO_FORMATS: VideoFormat[] = ['mp4', 'mkv', 'webm'];
// Used only when there's no per-video `videoFormats` prop to check against
// (the batch/playlist picker, which doesn't know any one video's real max
// resolution up front) - otherwise the row list comes straight from
// `videoFormats`, which already reflects what this specific video actually has.
const DEFAULT_VIDEO_QUALITIES: VideoQuality[] = [
  'original',
  '2160p',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
];

type Tab = 'video' | 'audio' | 'other';

const BASE_TABS: { key: 'video' | 'audio'; label: string; icon: typeof Music }[] = [
  { key: 'video', label: 'Video', icon: Film },
  { key: 'audio', label: 'Audio', icon: Music },
];

/** MP3-style constant-bitrate estimate: (kbps -> bytes/sec) * duration. Close enough for a preview. */
function estimateAudioSizeBytes(durationSeconds: number, kbps: number): number {
  return Math.round(((kbps * 1000) / 8) * durationSeconds);
}

function FormatPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
      )}
    >
      {label}
    </button>
  );
}

interface FormatRow {
  key: string;
  fileType: string;
  sizeLabel: string;
  onDownload: () => void;
}

function FormatTable({ rows, showSize }: { rows: FormatRow[]; showSize: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">File type</th>
            {showSize && <th className="px-3 py-2 text-left">Size</th>}
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-2.5 font-medium text-zinc-800">{row.fileType}</td>
              {showSize && <td className="px-3 py-2.5 text-zinc-500">{row.sizeLabel}</td>}
              <td className="px-3 py-2.5 text-right">
                <Button size="sm" onClick={row.onDownload}>
                  <Download size={14} />
                  Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface MediaFormatPickerProps {
  initialTab?: 'audio' | 'video';
  /** Video length in seconds - drives the audio tab's size estimate. Omitted in batch/multi-video contexts. */
  duration?: number | undefined;
  /** Real per-quality download sizes from yt-dlp. Omitted in batch/multi-video contexts. */
  videoFormats?: VideoFormatEstimate[] | undefined;
  onSelectAudio: (format: AudioFormat, quality: AudioQuality) => void;
  onSelectVideo: (format: VideoFormat, quality: VideoQuality) => void;
  /** Content for the third tab - defaults to a plain "coming soon" placeholder. */
  otherTab?: ReactNode;
  /** Label for the third tab - defaults to "Other". */
  otherTabLabel?: string;
  /** Icon for the third tab - defaults to a generic "more" icon. */
  otherTabIcon?: typeof Music;
  /** Set false to hide the third tab entirely - e.g. a batch/playlist picker with no single-video transcript to offer. */
  showOtherTab?: boolean;
  /** Set false to hide the Size column - e.g. a batch/playlist picker with no per-video size estimate to show. */
  showSizeColumn?: boolean;
}

const DEFAULT_OTHER_TAB = (
  <div className="flex flex-col items-center gap-2 py-10 text-center text-zinc-400">
    <MoreHorizontal size={28} />
    <p className="text-sm">More formats coming soon.</p>
  </div>
);

/** The tabbed audio/video/other format+size picker, with no dialog chrome - embed it inline or wrap it yourself. */
export function MediaFormatPicker({
  initialTab = 'video',
  duration,
  videoFormats,
  onSelectAudio,
  onSelectVideo,
  otherTab,
  otherTabLabel = 'Other',
  otherTabIcon = MoreHorizontal,
  showOtherTab = true,
  showSizeColumn = true,
}: MediaFormatPickerProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [audioFormat, setAudioFormat] = useState<AudioFormat>('mp3');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('mp4');

  const tabs = showOtherTab
    ? [...BASE_TABS, { key: 'other' as const, label: otherTabLabel, icon: otherTabIcon }]
    : BASE_TABS;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'audio' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AUDIO_FORMATS.map((option) => (
              <FormatPill
                key={option}
                label={option.toUpperCase()}
                active={audioFormat === option}
                onClick={() => {
                  setAudioFormat(option);
                }}
              />
            ))}
          </div>

          <FormatTable
            rows={AUDIO_QUALITIES.map((quality) => ({
              key: quality,
              fileType: `${audioFormat.toUpperCase()} - ${quality}kbps`,
              sizeLabel:
                duration !== undefined
                  ? formatBytes(estimateAudioSizeBytes(duration, Number(quality)))
                  : '—',
              onDownload: () => {
                onSelectAudio(audioFormat, quality);
              },
            }))}
            showSize={showSizeColumn}
          />
        </div>
      )}

      {tab === 'video' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {VIDEO_FORMATS.map((option) => (
              <FormatPill
                key={option}
                label={option.toUpperCase()}
                active={videoFormat === option}
                onClick={() => {
                  setVideoFormat(option);
                }}
              />
            ))}
          </div>

          <FormatTable
            rows={(videoFormats?.map((f) => f.quality) ?? DEFAULT_VIDEO_QUALITIES).map(
              (quality) => {
                const estimate = videoFormats?.find(
                  (f) => f.quality === quality,
                )?.estimatedSizeBytes;
                return {
                  key: quality,
                  fileType: `${videoFormat.toUpperCase()} - ${quality === 'original' ? 'Original' : quality}`,
                  sizeLabel: estimate !== undefined ? formatBytes(estimate) : '—',
                  onDownload: () => {
                    onSelectVideo(videoFormat, quality);
                  },
                };
              },
            )}
            showSize={showSizeColumn}
          />
        </div>
      )}

      {tab === 'other' && (otherTab ?? DEFAULT_OTHER_TAB)}
    </div>
  );
}

export interface MediaFormatSelectorProps extends MediaFormatPickerProps {
  open: boolean;
  onClose: () => void;
}

/** Dialog-wrapped variant of MediaFormatPicker, for flows that trigger it from a separate button (e.g. batch playlist actions). */
export function MediaFormatSelector({ open, onClose, ...pickerProps }: MediaFormatSelectorProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Download" className="max-w-lg">
      <div className="space-y-4">
        <MediaFormatPicker {...pickerProps} />
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
