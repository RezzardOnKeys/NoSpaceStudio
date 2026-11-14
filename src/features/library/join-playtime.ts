import type { Game, PlaytimeEntry } from '@/types/models';

export interface PlayedGame {
  game: Game;
  totalSeconds: number;
  lastPlayedAt: string;
}

/** Pairs playtime entries with their games and drops entries of hidden games. */
export function joinPlaytime(playtime: PlaytimeEntry[], games: Game[]): PlayedGame[] {
  const byId = new Map(games.map((game) => [game.id, game]));
  return playtime.flatMap((entry) => {
    const game = byId.get(entry.gameId);
    return game
      ? [{ game, totalSeconds: entry.totalSeconds, lastPlayedAt: entry.lastPlayedAt }]
      : [];
  });
}
