const YOUTUBE_ID_PATTERN = /^[\w-]{1,64}$/;

export function assertYoutubeId(id: string): void {
  if (!YOUTUBE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid YouTube id: ${id}`);
  }
}
