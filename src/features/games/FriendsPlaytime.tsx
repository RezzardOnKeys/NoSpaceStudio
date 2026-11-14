import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFriendsPlaytimeForGame } from '@/features/library/queries';
import { formatPlaytime } from '@/lib/format';
import { paths } from '@/routes/paths';

interface FriendsPlaytimeProps {
  gameId: string;
}

/** Which friends played this game, and for how long. */
export function FriendsPlaytime({ gameId }: FriendsPlaytimeProps) {
  const { data, isPending, isError } = useFriendsPlaytimeForGame(gameId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-fg-muted text-sm">
        Your friends&apos; playtime could not be loaded. Reload the page to try again.
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-fg-muted text-sm">
        None of your friends have played this yet. Be the first!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {data.map(({ profile, totalSeconds }) => (
        <li key={profile.id}>
          <Link
            to={paths.user(profile.username)}
            className="hover:bg-surface-overlay -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors"
          >
            <Avatar username={profile.username} src={profile.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{profile.username}</span>
            <span className="text-fg-muted text-sm tabular-nums">
              {formatPlaytime(totalSeconds)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
