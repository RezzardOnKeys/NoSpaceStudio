import { brand } from '@/config/brand';
import { cn } from '@/lib/cn';

import { LogoMark } from './LogoMark';

interface LogoProps {
  /** Hide the wordmark and show only the symbol (e.g. collapsed sidebar). */
  markOnly?: boolean;
  className?: string;
}

/** Symbol + typographic wordmark. All text comes from the brand config. */
export function Logo({ markOnly = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {markOnly ? (
        <span className="sr-only">{brand.name}</span>
      ) : (
        <span className="text-lg tracking-tight" aria-label={brand.name}>
          <span className="font-bold text-fg">{brand.wordmark.strong}</span>
          <span className="font-light text-fg-muted">{brand.wordmark.light}</span>
        </span>
      )}
    </span>
  );
}
