import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, cn, type InputProps } from '@ytp/ui';

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn('pr-10', className)}
          {...props}
          type={visible ? 'text' : 'password'}
        />
        <button
          type="button"
          onClick={() => {
            setVisible((current) => !current);
          }}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
