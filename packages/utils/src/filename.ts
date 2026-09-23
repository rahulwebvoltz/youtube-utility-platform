// eslint-disable-next-line no-control-regex -- control characters are intentionally stripped from filenames
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

export function sanitizeFilename(name: string, maxLength = 200): string {
  const sanitized = name.replace(UNSAFE_FILENAME_CHARS, '_').replace(/\s+/g, ' ').trim();

  return sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized || 'untitled';
}
