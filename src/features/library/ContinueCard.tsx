import { Link } from 'react-router';

import { formatPlaytime, formatRelative } from '@/lib/format';
import { paths } from '@/routes/paths';

import type { PlayedGame } from './join-playtime';

interface ContinueCardProps {
  played: PlayedGame;
}

/** Wide banner card for a recently played game; it opens the game page. */
export function ContinueCard({ played }: ContinueCardProps) {
  const { game } = played;

  return (
    <Link
      to={paths.game(game.slug)}
      className="group relative isolate flex aspect-video items-end overflow-hidden rounded-xl border border-line shadow-card transition-[border-color,box-shadow] duration-300 hover:border-accent/60 hover:shadow-glow"
    >
      <img
        src={game.bannerUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="flex w-full min-w-0 flex-col gap-0.5 p-4">
        <h3 className="truncate font-semibold text-white">{game.title}</h3>
        <p className="truncate text-sm text-white/75">
          {formatPlaytime(played.totalSeconds)} · {formatRelative(played.lastPlayedAt)}
        </p>
      </div>
    </Link>
  );
}
