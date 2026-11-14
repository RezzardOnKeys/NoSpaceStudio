import { cn } from '@/lib/cn';
import type { PresenceState } from '@/types/models';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
};

/** Size of the status dot in the bottom right corner, per avatar size. */
const dotSizes: Record<AvatarSize, string> = {
  sm: 'size-2.5 ring-2',
  md: 'size-3 ring-2',
  lg: 'size-3.5 ring-[3px]',
  xl: 'size-5 ring-4',
};

const dotColors: Record<PresenceState, string> = {
  online: 'bg-success',
  playing: 'bg-accent-bright',
  offline: 'bg-fg-subtle',
};

/** Fallback colours for users without a picture, picked by username. */
const palettes = [
  'bg-accent-soft text-accent-bright',
  'bg-success-soft text-success',
  'bg-info-soft text-info',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
] as const;

function pickPalette(username: string): string {
  const sum = Array.from(username).reduce((total, char) => total + char.charCodeAt(0), 0);
  return palettes[sum % palettes.length] ?? palettes[0];
}

interface AvatarProps {
  username: string;
  src?: string | null;
  size?: AvatarSize;
  /** Shows a coloured dot: green = online, violet = playing, grey = offline. */
  status?: PresenceState;
  className?: string;
}

/** Profile picture, or the first letter of the username when there is none. */
export function Avatar({ username, src, size = 'md', status, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0 rounded-full', sizes[size], className)}>
      {src ? (
        <img src={src} alt="" className="size-full rounded-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-full items-center justify-center rounded-full font-semibold uppercase select-none',
            pickPalette(username),
          )}
        >
          {username.charAt(0)}
        </span>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-0 bottom-0 rounded-full ring-surface',
            dotSizes[size],
            dotColors[status],
          )}
        />
      )}
    </span>
  );
}
