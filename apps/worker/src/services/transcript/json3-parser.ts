export interface RawTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface Json3Segment {
  utf8: string;
}

interface Json3Event {
  tStartMs: number;
  dDurationMs?: number;
  segs?: Json3Segment[];
}

interface Json3Document {
  events?: Json3Event[];
}

/**
 * YouTube's own timedtext JSON format. Word-level events (used for
 * auto-captions) carry per-word `segs`; sentence-level events (used for
 * manual captions) carry the whole line as one seg. Either way, joining a
 * event's segs and dropping the newline-only "append" events (which have no
 * real text) produces one readable segment per event.
 */
export function parseJson3(raw: string): RawTranscriptSegment[] {
  // YouTube's own timedtext format - every field is optionally-chained below,
  // so a malformed/unexpected shape degrades to an empty transcript rather than throwing.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
  const doc = JSON.parse(raw) as Json3Document;
  const segments: RawTranscriptSegment[] = [];

  for (const event of doc.events ?? []) {
    if (!event.segs || event.segs.length === 0) continue;

    const text = event.segs
      .map((seg) => seg.utf8)
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (!text) continue;

    const start = event.tStartMs / 1000;
    const end = start + (event.dDurationMs ?? 0) / 1000;
    segments.push({ start, end, text });
  }

  return segments;
}
