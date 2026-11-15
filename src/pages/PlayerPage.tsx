import { ArrowLeft, Clock, Ghost, LoaderCircle, Maximize, Minimize } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { useAuth } from '@/features/auth/auth-context';
import { EngineBadge } from '@/features/games/EngineBadge';
import { useGame } from '@/features/games/queries';
import { PartyAvatars } from '@/features/party/PartyAvatars';
import { usePartyLaunch, useStopPartyGameOnLeave } from '@/features/party/usePartyLaunch';
import { GameFrame } from '@/features/player/GameFrame';
import { useFullscreen } from '@/features/player/useFullscreen';
import { usePlaytimeTracker } from '@/features/player/usePlaytimeTracker';
import { useSessionTimer } from '@/features/player/useSessionTimer';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { describeLoadError } from '@/lib/errors';
import { formatTimer } from '@/lib/format';
import { paths } from '@/routes/paths';
import type { Game } from '@/types/models';

interface PlayerProps {
  game: Game;
  /** Party details for the game (see usePartyLaunch), or null. */
  partyHash: string | null;
  isPartyHost: boolean;
}

/** Mounted only once the game is known, so the timer starts with the game. */
function Player(props: PlayerProps) {
  const { game } = props;
  // Fixed when the game opens: a party change later (e.g. the host leaves)
  // must not reload a game that is running.
  const [{ partyHash, isPartyHost }] = useState(() => ({
    partyHash: props.partyHash,
    isPartyHost: props.isPartyHost,
  }));
  const frameRef = useRef<HTMLDivElement>(null);
  useStopPartyGameOnLeave(isPartyHost);
  const { userId } = useAuth();
  const seconds = useSessionTimer();
  usePlaytimeTracker(game.slug, seconds);
  const { isFullscreen, isSupported, toggle } = useFullscreen(frameRef);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-2 sm:px-3">
        <Link
          to={paths.game(game.slug)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-overlay hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="truncate text-sm font-semibold">{game.title}</h1>
          <EngineBadge engine={game.engine} className="hidden sm:inline-flex" />
          {/* Who plays along, like next to "Party" in the sidebar. */}
          {partyHash && <PartyAvatars className="shrink-0" />}
        </div>
        {!userId && (
          <Link
            to={paths.signIn}
            className="hidden rounded text-sm text-fg-subtle hover:text-fg md:inline"
          >
            Sign in to save your playtime
          </Link>
        )}
        <p
          className="flex items-center gap-1.5 text-sm text-fg-muted tabular-nums"
          title="Time played in this session"
        >
          <Clock className="size-4" aria-hidden="true" />
          <span className="sr-only">Session time: </span>
          <span role="timer">{formatTimer(seconds)}</span>
        </p>
        {isSupported && (
          <IconButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggle}>
            {isFullscreen ? (
              <Minimize className="size-5" aria-hidden="true" />
            ) : (
              <Maximize className="size-5" aria-hidden="true" />
            )}
          </IconButton>
        )}
      </header>
      <GameFrame game={game} hash={partyHash} containerRef={frameRef} />
    </div>
  );
}

export function PlayerPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { data: game, isPending, isError, error, refetch } = useGame(slug);
  const launch = usePartyLaunch(slug ?? '', searchParams.get('session'));
  useDocumentTitle(game ? `Playing ${game.title}` : 'Player');

  if (isPending || launch.isLoading) {
    return (
      <main className="flex h-dvh items-center justify-center" role="status">
        <LoaderCircle className="size-8 animate-spin text-accent-bright" aria-hidden="true" />
        <span className="sr-only">Loading game</span>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <ErrorState
          title="We could not load this game"
          description={describeLoadError(error)}
          onRetry={() => void refetch()}
        />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex h-dvh items-center justify-center">
        <EmptyState
          icon={<Ghost />}
          title="This game does not exist"
          description="It may have been removed or the link is wrong."
          action={
            <Link to={paths.store} className={buttonStyles()}>
              Browse the store
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <Player
      // A new party session (?session=...) starts the game fresh.
      key={`${game.id}-${searchParams.get('session') ?? 'solo'}`}
      game={game}
      partyHash={launch.hash}
      isPartyHost={launch.isHost}
    />
  );
}
