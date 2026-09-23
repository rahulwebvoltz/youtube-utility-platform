import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import type { Transcript } from '@ytp/types';
import { Button } from '@ytp/ui';
import {
  sanitizeFilename,
  segmentsToMarkdown,
  segmentsToSrt,
  segmentsToTxt,
  segmentsToVtt,
} from '@ytp/utils';

const FORMATS = [
  { key: 'txt', label: 'TXT' },
  { key: 'srt', label: 'SRT' },
  { key: 'vtt', label: 'VTT' },
  { key: 'json', label: 'JSON' },
  { key: 'markdown', label: 'Markdown' },
] as const;

type ExportFormat = (typeof FORMATS)[number]['key'];

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ transcript, title }: { transcript: Transcript; title: string }) {
  const [open, setOpen] = useState(false);
  const baseName = sanitizeFilename(title, 60);

  const handleExport = (format: ExportFormat) => {
    setOpen(false);
    switch (format) {
      case 'txt':
        downloadFile(`${baseName}.txt`, segmentsToTxt(transcript.segments), 'text/plain');
        break;
      case 'srt':
        downloadFile(`${baseName}.srt`, segmentsToSrt(transcript.segments), 'text/plain');
        break;
      case 'vtt':
        downloadFile(`${baseName}.vtt`, segmentsToVtt(transcript.segments), 'text/vtt');
        break;
      case 'markdown':
        downloadFile(
          `${baseName}.md`,
          segmentsToMarkdown(transcript.segments, title),
          'text/markdown',
        );
        break;
      case 'json':
        downloadFile(`${baseName}.json`, JSON.stringify(transcript, null, 2), 'application/json');
        break;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <Download size={14} />
        Export
        <ChevronDown size={14} />
      </Button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close export menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => {
              setOpen(false);
            }}
          />
          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            {FORMATS.map((format) => (
              <button
                key={format.key}
                onClick={() => {
                  handleExport(format.key);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                {format.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
