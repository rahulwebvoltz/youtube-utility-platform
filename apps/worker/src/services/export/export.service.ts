import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import archiver from 'archiver';
import {
  JobModel,
  PlaylistModel,
  PlaylistItemModel,
  TranscriptModel,
  VideoModel,
  MediaFileModel,
} from '@ytp/db';
import type { CombinedTranscriptFormat, PlaylistManifestFormat } from '@ytp/types';
import {
  combinedTranscriptsToJson,
  combinedTranscriptsToMarkdown,
  combinedTranscriptsToTxt,
  sanitizeFilename,
  type CombinedTranscriptEntry,
} from '@ytp/utils';
import { storageService } from '@/storage.js';

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function buildPlaylistManifest(
  playlistId: string,
  format: PlaylistManifestFormat,
  outputPath: string,
): Promise<void> {
  const playlist = await PlaylistModel.findOne({ youtubeId: playlistId });
  if (!playlist) {
    throw new Error(`Playlist not found: ${playlistId}`);
  }

  const items = await PlaylistItemModel.find({ playlistId: playlist._id }).sort({ position: 1 });
  const rows = items.map((item) => ({
    position: item.position + 1,
    title: item.title,
    videoId: item.videoId,
    duration: item.duration,
    url: `https://www.youtube.com/watch?v=${item.videoId}`,
  }));

  if (format === 'json') {
    await writeFile(outputPath, JSON.stringify(rows, null, 2), 'utf8');
    return;
  }

  const header = 'position,title,videoId,duration,url';
  const lines = rows.map((row) =>
    [row.position, csvEscape(row.title), row.videoId, row.duration, row.url].join(','),
  );
  await writeFile(outputPath, [header, ...lines].join('\n'), 'utf8');
}

/** Every completed transcript job fanned out from the given playlist batch job. */
async function completedTranscriptEntries(
  playlistJobId: string,
): Promise<CombinedTranscriptEntry[]> {
  const children = await JobModel.find({
    parentJobId: playlistJobId,
    type: 'transcript',
    status: 'completed',
  }).sort({ createdAt: 1 });

  const entries: CombinedTranscriptEntry[] = [];
  for (const child of children) {
    // Mongoose's Schema.Types.Mixed resolves to `any` for job.result.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
    const result = child.result as { transcriptId?: string } | undefined;
    if (!result?.transcriptId) continue;

    const transcript = await TranscriptModel.findById(result.transcriptId);
    if (!transcript) continue;

    const youtubeId = child.source.videoId;
    const video = youtubeId ? await VideoModel.findOne({ youtubeId }) : null;

    entries.push({
      title: video?.metadata.title ?? youtubeId ?? 'Untitled',
      language: transcript.language,
      wordCount: transcript.wordCount,
      segments: transcript.segments,
    });
  }
  return entries;
}

export async function buildCombinedTranscript(
  playlistJobId: string,
  format: CombinedTranscriptFormat,
  outputPath: string,
): Promise<void> {
  const entries = await completedTranscriptEntries(playlistJobId);
  if (entries.length === 0) {
    throw new Error('No completed transcripts to combine');
  }

  const content =
    format === 'json'
      ? combinedTranscriptsToJson(entries)
      : format === 'markdown'
        ? combinedTranscriptsToMarkdown(entries)
        : combinedTranscriptsToTxt(entries);

  await writeFile(outputPath, content, 'utf8');
}

export async function buildMediaBundle(
  playlistJobId: string,
  scratchDir: string,
  outputPath: string,
): Promise<void> {
  const children = await JobModel.find({
    parentJobId: playlistJobId,
    type: { $in: ['audio', 'video'] },
    status: 'completed',
  }).sort({ createdAt: 1 });

  const files: { path: string; name: string }[] = [];
  let index = 0;

  for (const child of children) {
    // Mongoose's Schema.Types.Mixed resolves to `any` for job.result.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see comment above
    const result = child.result as { mediaFileId?: string } | undefined;
    if (!result?.mediaFileId) continue;

    const mediaFile = await MediaFileModel.findById(result.mediaFileId);
    if (!mediaFile) continue;

    const youtubeId = child.source.videoId;
    const video = youtubeId ? await VideoModel.findOne({ youtubeId }) : null;
    const baseName = sanitizeFilename(video?.metadata.title ?? youtubeId ?? `file-${index}`, 80);

    index += 1;
    const localPath = path.join(scratchDir, `${index}-${baseName}.${mediaFile.format}`);
    await storageService.downloadFile(mediaFile.storage.key, localPath);
    files.push({ path: localPath, name: `${baseName}.${mediaFile.format}` });
  }

  if (files.length === 0) {
    throw new Error('No completed media files to bundle');
  }

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    for (const file of files) archive.file(file.path, { name: file.name });
    void archive.finalize();
  });
}
