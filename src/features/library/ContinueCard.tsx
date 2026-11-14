import { Play } from 'lucide-react';
import { Link } from 'react-router';

import { formatPlaytime, formatRelative } from '@/lib/format';
import { paths } from '@/routes/paths';

import type { PlayedGame } from './join-playtime';

interface ContinueCardProps {
  played: PlayedGame;
}

/** Wide banner card that jumps straight back into a recently played game. */
export function ContinueCard({ played }: ContinueCardProps) {
  const { game } = played;

  return (
    <Link
      to={paths.play(game.slug)}
      aria-label={`Continue playing ${game.title}`}
      className="group relative isolate flex aspect-video items-end overflow-hidden rounded-xl border border-line shadow-card transition-[border-color,box-shadow] duration-300 hover:border-accent/60 hover:shadow-glow"
    >
      <img
        src={game.bannerUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="flex w-full items-end justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate font-semibold text-white">{game.title}</h3>
          <p className="truncate text-sm text-white/75">
            {formatPlaytime(played.totalSeconds)} · {formatRelative(played.lastPlayedAt)}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-strong text-on-accent transition-colors group-hover:bg-accent">
          <Play className="size-4 fill-current" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
