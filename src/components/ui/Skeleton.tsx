import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Placeholder block shown while content loads. Size it with utilities,
 * e.g. <Skeleton className="h-4 w-32" />. Hidden from screen readers; wrap
 * a loading region in an element with aria-busy instead.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-md bg-surface-overlay bg-[linear-gradient(90deg,transparent_25%,rgb(255_255_255/0.07)_50%,transparent_75%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}
