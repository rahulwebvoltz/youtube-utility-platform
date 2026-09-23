import type { MouseEvent } from 'react';
import type { PlaylistItem } from '@ytp/types';
import { cn } from '@ytp/ui';
import { formatDuration } from '@ytp/utils';

interface PlaylistItemRowProps {
  item: PlaylistItem;
  selected: boolean;
  onToggle: (event: MouseEvent<HTMLLabelElement>) => void;
}

export function PlaylistItemRow({ item, selected, onToggle }: PlaylistItemRowProps) {
  return (
    // The wrapped <input type="checkbox"> already provides full keyboard/AT
    // support (native tab stop, Space/Enter toggles it) - this <label> is the
    // standard "click anywhere in the row" pattern, not a bare non-interactive element.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <label
      onClick={onToggle}
      className={cn(
        'flex cursor-pointer select-none items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
        selected
          ? 'border-brand-300 bg-brand-50'
          : 'border-zinc-200 bg-white hover:border-zinc-300',
      )}
    >
      <input type="checkbox" checked={selected} readOnly className="h-4 w-4 accent-brand-600" />
      <span className="w-7 shrink-0 text-xs tabular-nums text-zinc-400">
        {String(item.position + 1).padStart(2, '0')}
      </span>
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="hidden h-10 w-16 shrink-0 rounded object-cover sm:block"
        />
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{item.title}</span>
      <span className="shrink-0 text-xs tabular-nums text-zinc-400">
        {formatDuration(item.duration)}
      </span>
    </label>
  );
}
