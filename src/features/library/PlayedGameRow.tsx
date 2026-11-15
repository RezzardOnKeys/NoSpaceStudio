import { Link } from 'react-router';

import { EngineBadge } from '@/features/games/EngineBadge';
import { formatPlaytime, formatRelative } from '@/lib/format';
import { paths } from '@/routes/paths';

import type { PlayedGame } from './join-playtime';

interface PlayedGameRowProps {
  played: PlayedGame;
  /** Longest playtime in the list; scales the bar. Omit to hide the bar. */
  maxSeconds?: number;
}

/**
 * One game in a playtime list: cover, title, playtime and last played. The
 * whole row links to the game page; games are started there, so a party
 * always comes along.
 */
export function PlayedGameRow({ played, maxSeconds }: PlayedGameRowProps) {
  const { game } = played;
  const share = maxSeconds ? Math.max(4, (played.totalSeconds / maxSeconds) * 100) : null;

  return (
    <li className="relative flex items-center gap-4 rounded-xl p-2.5 transition-colors hover:bg-surface-raised">
      <img
        src={game.coverUrl}
        alt=""
        loading="lazy"
        className="h-20 w-15 shrink-0 rounded-lg border border-line object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <h3 className="truncate font-semibold">
            <Link to={paths.game(game.slug)} className="rounded after:absolute after:inset-0">
              {game.title}
            </Link>
          </h3>
          <EngineBadge engine={game.engine} className="hidden sm:inline-flex" />
        </div>
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg tabular-nums">
            {formatPlaytime(played.totalSeconds)}
          </span>{' '}
          played · last played {formatRelative(played.lastPlayedAt)}
        </p>
        {share !== null && (
          <div
            className="h-1.5 max-w-sm overflow-hidden rounded-full bg-surface-overlay"
            aria-hidden="true"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}
