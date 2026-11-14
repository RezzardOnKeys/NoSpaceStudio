import { Play } from 'lucide-react';
import { Link } from 'react-router';

import { Skeleton } from '@/components/ui/Skeleton';
import { paths } from '@/routes/paths';
import type { Game } from '@/types/models';

import { EngineBadge } from './EngineBadge';

interface GameCardProps {
  game: Game;
}

/**
 * Cover card for the store grid. The whole card links to the game page;
 * the play button on hover jumps straight into the game.
 */
export function GameCard({ game }: GameCardProps) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="border-line bg-surface-raised shadow-card group-hover:border-accent/60 group-hover:shadow-glow relative aspect-[3/4] overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300">
        <img
          src={game.coverUrl}
          alt=""
          loading="lazy"
          className="ease-out-soft size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <EngineBadge engine={game.engine} variant="overlay" className="absolute top-2.5 left-2.5" />
        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 justify-center bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 opacity-0 transition-[opacity,transform] duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
          <Link
            to={paths.play(game.slug)}
            aria-label={`Play ${game.title}`}
            className="bg-accent-strong text-on-accent hover:bg-accent relative z-10 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Play className="size-4 fill-current" aria-hidden="true" />
            Play
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="truncate font-semibold">
          {/* The ::after layer stretches this link over the whole card. */}
          <Link to={paths.game(game.slug)} className="rounded after:absolute after:inset-0">
            {game.title}
          </Link>
        </h3>
        <p className="text-fg-subtle truncate text-sm">{game.genres.join(' · ')}</p>
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
