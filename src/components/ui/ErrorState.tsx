import { CloudOff, RotateCw } from 'lucide-react';

import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  /** What failed, e.g. "We could not load the games". */
  title: string;
  /** How to fix it. Defaults to a hint about the internet connection. */
  description?: string;
  onRetry: () => void;
  className?: string;
}

/** Shown when loading data failed. Always offers a way to try again. */
export function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  return (
    <EmptyState
      className={className}
      icon={<CloudOff />}
      title={title}
      description={
        description ??
        'Check your internet connection and try again. If it keeps happening, come back in a few minutes.'
      }
      action={
        <Button variant="secondary" icon={<RotateCw className="size-4" />} onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
