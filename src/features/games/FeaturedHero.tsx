import { Info, Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/button-styles';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import type { Game } from '@/types/models';

import { EngineBadge } from './EngineBadge';

interface FeaturedHeroProps {
  games: Game[];
}

/** Large banner at the top of the store. With several featured games, the
 *  list on the right switches between them. */
export function FeaturedHero({ games }: FeaturedHeroProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const game = games.find((candidate) => candidate.id === selectedId) ?? games[0];

  if (!game) return null;

  return (
    <section aria-label="Featured games" className="grid gap-4 xl:grid-cols-[1fr_17rem]">
      <div className="border-line shadow-card relative isolate flex min-h-[20rem] items-end overflow-hidden rounded-2xl border sm:min-h-[26rem]">
        <img
          key={game.id}
          src={game.bannerUrl}
          alt=""
          className="animate-fade-in absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="from-canvas via-canvas/60 absolute inset-0 -z-10 bg-gradient-to-t to-transparent" />
        <div className="from-canvas/80 absolute inset-0 -z-10 bg-gradient-to-r to-transparent" />

        <div className="flex max-w-xl flex-col items-start gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Featured</Badge>
            <EngineBadge engine={game.engine} variant="overlay" />
          </div>
          <h2 className="text-3xl font-bold sm:text-5xl">{game.title}</h2>
          <p className="text-fg-muted sm:text-lg">{game.shortDescription}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to={paths.play(game.slug)} className={buttonStyles({ size: 'lg' })}>
              <Play className="size-5 fill-current" aria-hidden="true" />
              Play now
            </Link>
            <Link
              to={paths.game(game.slug)}
              className={buttonStyles({ variant: 'secondary', size: 'lg' })}
            >
              <Info className="size-5" aria-hidden="true" />
              Details
            </Link>
          </div>
        </div>
      </div>

      {games.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto xl:flex-col xl:overflow-visible">
          {games.map((candidate) => {
            const selected = candidate.id === game.id;
            return (
              <li key={candidate.id} className="shrink-0 xl:shrink">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedId(candidate.id)}
                  className={cn(
                    'flex w-60 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors duration-150 xl:w-full',
                    selected
                      ? 'border-line-strong bg-surface-overlay'
                      : 'hover:bg-surface-raised border-transparent',
                  )}
                >
                  <img
                    src={candidate.coverUrl}
                    alt=""
                    className="h-16 w-12 shrink-0 rounded-md object-cover"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{candidate.title}</span>
                    <span className="text-fg-subtle truncate text-xs">
                      {candidate.genres.join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FeaturedHeroSkeleton() {
  return <Skeleton className="min-h-[20rem] w-full rounded-2xl sm:min-h-[26rem]" />;
}
