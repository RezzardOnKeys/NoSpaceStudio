import { cn } from '@/lib/cn';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
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
  className?: string;
}

/** Profile picture, or the first letter of the username when there is none. */
export function Avatar({ username, src, size = 'md', className }: AvatarProps) {
  const shared = cn('shrink-0 rounded-full', sizes[size], className);

  if (src) {
    return <img src={src} alt="" className={cn(shared, 'object-cover')} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        shared,
        'inline-flex items-center justify-center font-semibold uppercase select-none',
        pickPalette(username),
      )}
    >
      {username.charAt(0)}
    </span>
  );
}
