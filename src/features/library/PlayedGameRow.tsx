import { Play } from 'lucide-react';
import { Link } from 'react-router';

import { buttonStyles } from '@/components/ui/button-styles';
import { EngineBadge } from '@/features/games/EngineBadge';
import { formatPlaytime, formatRelative } from '@/lib/format';
import { paths } from '@/routes/paths';

import type { PlayedGame } from './join-playtime';

interface PlayedGameRowProps {
  played: PlayedGame;
  /** Longest playtime in the list; scales the bar. Omit to hide the bar. */
  maxSeconds?: number;
}

/** One game in a playtime list: cover, title, playtime and last played. */
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
      <Link
        to={paths.play(game.slug)}
        aria-label={`Play ${game.title}`}
        className={buttonStyles({ variant: 'secondary', className: 'relative z-10' })}
      >
        <Play className="size-4 fill-current" aria-hidden="true" />
        <span className="hidden sm:inline">Play</span>
      </Link>
    </li>
  );
}
