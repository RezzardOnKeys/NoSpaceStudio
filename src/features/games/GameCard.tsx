import { Users } from 'lucide-react';
import { Link } from 'react-router';

import { Skeleton } from '@/components/ui/Skeleton';
import { paths } from '@/routes/paths';
import type { Game } from '@/types/models';

import { EngineBadge } from './EngineBadge';

interface GameCardProps {
  game: Game;
}

/**
 * Cover card for the store grid. The whole card links to the game page,
 * where the game is started (so a party always comes along).
 */
export function GameCard({ game }: GameCardProps) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card transition-[border-color,box-shadow] duration-300 group-hover:border-accent/60 group-hover:shadow-glow">
        <img
          src={game.coverUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
        />
        <EngineBadge engine={game.engine} variant="overlay" className="absolute top-2.5 left-2.5" />
        {game.maxPlayers > 1 && (
          <span className="absolute top-2.5 right-2.5 inline-flex h-6 items-center gap-1 rounded-md bg-black/65 px-2 text-xs font-medium text-white backdrop-blur-sm">
            <Users className="size-3" aria-hidden="true" />
            {`1–${game.maxPlayers}`}
            <span className="sr-only"> players</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="truncate font-semibold">
          {/* The ::after layer stretches this link over the whole card. */}
          <Link to={paths.game(game.slug)} className="rounded after:absolute after:inset-0">
            {game.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-fg-subtle">{game.genres.join(' · ')}</p>
      </div>
    </article>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
