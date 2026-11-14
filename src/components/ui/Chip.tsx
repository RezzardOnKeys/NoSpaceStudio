import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Toggle button for filters. Announces its on/off state to screen readers. */
export function Chip({ selected, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'h-8 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150',
        selected
          ? 'border-accent bg-accent-soft text-accent-bright'
          : 'border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg',
        className,
      )}
      {...props}
    />
  );
}
