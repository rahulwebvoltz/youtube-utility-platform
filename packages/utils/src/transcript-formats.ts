export interface TranscriptSegmentLike {
  start: number;
  end: number;
  text: string;
}

function formatTimestamp(totalSeconds: number, decimalSeparator: ',' | '.'): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000);

  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${decimalSeparator}${pad(millis, 3)}`;
}

export function segmentsToSrt(segments: TranscriptSegmentLike[]): string {
  return segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.start, ',');
      const end = formatTimestamp(segment.end, ',');
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
}

export function segmentsToVtt(segments: TranscriptSegmentLike[]): string {
  const body = segments
    .map((segment) => {
      const start = formatTimestamp(segment.start, '.');
      const end = formatTimestamp(segment.end, '.');
      return `${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

export function segmentsToTxt(segments: TranscriptSegmentLike[]): string {
  return segments.map((segment) => segment.text).join('\n');
}

export function segmentsToMarkdown(segments: TranscriptSegmentLike[], title?: string): string {
  const heading = title ? `# ${title}\n\n` : '';
  const body = segments
    .map((segment) => `**[${formatTimestamp(segment.start, '.').slice(0, 8)}]** ${segment.text}`)
    .join('\n\n');
  return `${heading}${body}`;
}

export interface CombinedTranscriptEntry {
  title: string;
  language: string;
  wordCount: number;
  segments: TranscriptSegmentLike[];
}

/** Multiple videos' transcripts concatenated into one readable file, each under its own heading. */
export function combinedTranscriptsToTxt(entries: CombinedTranscriptEntry[]): string {
  return entries
    .map(
      (entry) =>
        `${entry.title}\n${'='.repeat(entry.title.length)}\n\n${segmentsToTxt(entry.segments)}`,
    )
    .join('\n\n\n');
}

export function combinedTranscriptsToMarkdown(entries: CombinedTranscriptEntry[]): string {
  return entries
    .map((entry) => `## ${entry.title}\n\n${segmentsToMarkdown(entry.segments)}`)
    .join('\n\n---\n\n');
}

export function combinedTranscriptsToJson(entries: CombinedTranscriptEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      title: entry.title,
      language: entry.language,
      wordCount: entry.wordCount,
      segments: entry.segments,
    })),
    null,
    2,
  );
}
