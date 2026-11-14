import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** Explain what is missing and how to change that. */
  description?: string;
  /** Usually one button that solves the empty state. */
  action?: ReactNode;
  className?: string;
}

/** Friendly placeholder for lists without content and for error pages. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 px-6 py-12 text-center', className)}>
      <span
        className="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface-raised text-accent-bright [&>svg]:size-6"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
