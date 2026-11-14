import { cn } from '@/lib/cn';

import { useFriendStatus } from './queries';
import { useStatusLabel } from './useStatusLabel';

interface StatusLineProps {
  userId: string;
}

/** A friend's status as a coloured line of text. Nothing for non-friends. */
export function StatusLine({ userId }: StatusLineProps) {
  const status = useFriendStatus(userId);
  const label = useStatusLabel(userId);
  if (!status || !label) return null;

  return (
    <p
      className={cn(
        'font-medium',
        status.state === 'online' && 'text-success',
        status.state === 'playing' && 'text-accent-bright',
        status.state === 'offline' && 'text-fg-subtle',
      )}
    >
      {label}
    </p>
  );
}
