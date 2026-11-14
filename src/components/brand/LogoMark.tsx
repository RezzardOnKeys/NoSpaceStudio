import { useId } from 'react';

import { cn } from '@/lib/cn';

interface LogoMarkProps {
  className?: string;
}

/** The square "N" symbol. Decorative on its own; pair it with text or a label. */
export function LogoMark({ className }: LogoMarkProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-accent-bright)" />
          <stop offset="1" stopColor="var(--color-accent-strong)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path
        d="M10 22.5V9.5l12 13V9.5"
        fill="none"
        stroke="var(--color-on-accent)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
