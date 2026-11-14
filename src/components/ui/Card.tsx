import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover feedback for cards that act as a link or button target. */
  interactive?: boolean;
  /** Removes the default padding, e.g. for edge-to-edge cover images. */
  flush?: boolean;
}

export function Card({ interactive = false, flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface-raised shadow-card',
        !flush && 'p-5',
        interactive &&
          'transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-overlay',
        className,
      )}
      {...props}
    />
  );
}
