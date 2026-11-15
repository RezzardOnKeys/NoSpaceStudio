import type { Game } from '@/types/models';

type PlayerRules = Pick<Game, 'minPlayers' | 'maxPlayers' | 'evenPlayers'>;

/** Every number of players the game can be played with, smallest first. */
export function allowedPlayerCounts(game: PlayerRules): number[] {
  const counts: number[] = [];
  for (let count = game.minPlayers; count <= game.maxPlayers; count++) {
    if (!game.evenPlayers || count % 2 === 0) counts.push(count);
  }
  return counts;
}

/** True when the game cannot be played alone. */
export function needsParty(game: PlayerRules): boolean {
  return !allowedPlayerCounts(game).includes(1);
}

/** "2–8" for the badge on the store card; "2" when there is only one count. */
export function playerRange(game: PlayerRules): string {
  const counts = allowedPlayerCounts(game);
  const first = counts[0];
  const last = counts.at(-1);
  return first === last ? String(first) : `${first}–${last}`;
}

/** "2, 4, 6 or 8": the allowed counts as words for a sentence. */
export function playerCountList(game: PlayerRules): string {
  const counts = allowedPlayerCounts(game).map(String);
  const last = counts.pop();
  return counts.length > 0 ? `${counts.join(', ')} or ${last}` : String(last);
}

/** The "Players" line on the game page, e.g. "2–8, even number, party only". */
export function playerSummary(game: PlayerRules): string {
  if (game.maxPlayers === 1) return 'Single player';
  const parts = [playerRange(game)];
  if (game.evenPlayers) parts.push('even number');
  parts.push(needsParty(game) ? 'party only' : 'party');
  return parts.join(', ');
}
