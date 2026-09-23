export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];
  return parts.map((part, i) => (i === 0 ? String(part) : String(part).padStart(2, '0'))).join(':');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent] ?? ''}`;
}

/** Human-readable language name for a BCP-47/ISO code (e.g. "gu" -> "Gujarati") - falls back to the raw code for anything `Intl` doesn't recognize. */
export function formatLanguageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
