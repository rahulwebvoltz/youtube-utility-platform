import { Button, Dialog } from '@ytp/ui';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  formats: { value: string; label: string }[];
  onSelect: (format: string) => void;
  busy?: boolean;
}

export function ExportDialog({
  open,
  onClose,
  title,
  formats,
  onSelect,
  busy = false,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex flex-wrap gap-2">
        {formats.map((format) => (
          <Button
            key={format.value}
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              onSelect(format.value);
            }}
          >
            {format.label}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}
