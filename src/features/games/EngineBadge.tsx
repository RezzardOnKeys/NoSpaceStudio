import { Cpu } from 'lucide-react';

import { cn } from '@/lib/cn';

interface EngineBadgeProps {
  engine: string;
  /** "overlay" sits on top of artwork, "plain" on a regular surface. */
  variant?: 'overlay' | 'plain';
  className?: string;
}

/** Label that tells which engine a game was built with. Any text works. */
export function EngineBadge({ engine, variant = 'plain', className }: EngineBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold tracking-wide whitespace-nowrap',
        variant === 'overlay'
          ? 'bg-black/65 text-white backdrop-blur-sm'
          : 'border-line-strong text-fg-muted border',
        className,
      )}
    >
      <Cpu className="size-3" aria-hidden="true" />
      <span className="sr-only">Engine: </span>
      {engine}
    </span>
  );
}
