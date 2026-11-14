import { Clock, Gamepad2, Lock, ShieldCheck, Trophy, UserX } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGames } from '@/features/games/queries';
import { joinPlaytime } from '@/features/library/join-playtime';
import { PlayedGameRow } from '@/features/library/PlayedGameRow';
import { useUserPlaytime } from '@/features/library/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatPlaytime } from '@/lib/format';
import { paths } from '@/routes/paths';

import { StatCard } from './StatCard';

interface ProfileViewProps {
  username: string;
  /** True when the signed-in user looks at their own profile. */
  isOwn: boolean;
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-5">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-21 rounded-xl" />
        ))}
      </div>
      <ListSkeleton rows={3} leading="cover" />
    </div>
  );
}

/** A player's profile: avatar, name, statistics and most played games. */
export function ProfileView({ username, isOwn }: ProfileViewProps) {
  const user = useUserPlaytime(username);
  const games = useGames();
  useDocumentTitle(isOwn ? 'Your profile' : username);

  if (user.isPending || games.isPending) return <ProfileSkeleton />;

  if (user.isError || games.isError) {
    return (
      <ErrorState
        title="We could not load this profile"
        onRetry={() => {
          void user.refetch();
          void games.refetch();
        }}
      />
    );
  }

  if (!user.data) {
    return (
      <EmptyState
        icon={<UserX />}
        title="This player does not exist"
        description={`Nobody is called “${username}”. Check the spelling or search for them on the friends page.`}
        action={
          <Link to={paths.friends} className={buttonStyles({ variant: 'secondary' })}>
            Go to friends
          </Link>
        }
      />
    );
  }

  const { profile, playtime } = user.data;
  const played = playtime
    ? joinPlaytime(playtime, games.data).sort((a, b) => b.totalSeconds - a.totalSeconds)
    : null;
  const totalSeconds = played?.reduce((sum, item) => sum + item.totalSeconds, 0) ?? 0;
  const topGame = played?.[0];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar username={profile.username} src={profile.avatarUrl} size="xl" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            {profile.isAdmin && (
              <Badge variant="accent">
                <ShieldCheck aria-hidden="true" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-fg-muted">
            Member since <time dateTime={profile.createdAt}>{formatDate(profile.createdAt)}</time>
          </p>
        </div>
      </header>

      {played === null ? (
        <EmptyState
          icon={<Lock />}
          title="This playtime is private"
          description={`Only confirmed friends can see what ${profile.username} plays. Send a friend request to compare playtime.`}
          action={
            <Link to={paths.friends} className={buttonStyles({ variant: 'secondary' })}>
              Go to friends
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Clock} label="Total playtime" value={formatPlaytime(totalSeconds)} />
            <StatCard icon={Gamepad2} label="Games played" value={String(played.length)} />
            <StatCard
              icon={Trophy}
              label="Most played"
              value={topGame?.game.title ?? 'Nothing yet'}
            />
          </div>

          <section aria-labelledby="most-played-heading" className="flex flex-col gap-3">
            <h2 id="most-played-heading" className="text-xl font-semibold">
              Most played games
            </h2>
            {played.length === 0 ? (
              <EmptyState
                icon={<Gamepad2 />}
                title="No games played yet"
                description={
                  isOwn
                    ? 'Your statistics start as soon as you play your first game.'
                    : `${profile.username} has not played anything yet.`
                }
                action={
                  isOwn ? (
                    <Link to={paths.store} className={buttonStyles()}>
                      Browse the store
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <ul className="-mx-2.5 flex flex-col gap-1">
                {played.map((item) => (
                  <PlayedGameRow
                    key={item.game.id}
                    played={item}
                    maxSeconds={topGame?.totalSeconds}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
