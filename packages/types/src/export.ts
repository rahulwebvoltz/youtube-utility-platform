/**
 * A single video's transcript export (TXT/SRT/VTT/JSON/Markdown) is small
 * enough to format instantly in the browser - see @ytp/utils's
 * segmentsTo*() helpers - so it never touches this backend export system.
 * What's here is specifically for playlist-level output too large or
 * multi-source to build client-side: a manifest of a playlist's items, a
 * transcript combined across a batch's videos, or a ZIP of a batch's
 * downloaded media - each produced by an async `export` Job and delivered
 * the same way audio/video jobs are (a MediaFile + signed download URL).
 */
export type ExportKind = 'playlist-manifest' | 'combined-transcript' | 'media-bundle';

export type PlaylistManifestFormat = 'csv' | 'json';
export type CombinedTranscriptFormat = 'txt' | 'markdown' | 'json';
