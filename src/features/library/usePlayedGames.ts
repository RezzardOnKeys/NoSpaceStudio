import { useMemo } from 'react';

import { useGames } from '@/features/games/queries';

import { joinPlaytime, type PlayedGame } from './join-playtime';
import { useMyPlaytime } from './queries';

interface PlayedGamesResult {
  /** Most recently played first. Undefined while loading. */
  played: PlayedGame[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** The signed-in user's played games, joined with the game details. */
export function usePlayedGames(): PlayedGamesResult {
  const games = useGames();
  const playtime = useMyPlaytime();

  const played = useMemo(() => {
    if (!games.data || !playtime.data) return undefined;
    return joinPlaytime(playtime.data, games.data).sort((a, b) =>
      b.lastPlayedAt.localeCompare(a.lastPlayedAt),
    );
  }, [games.data, playtime.data]);

  return {
    played,
    isPending: games.isPending || playtime.isPending,
    isError: games.isError || playtime.isError,
    refetch: () => {
      void games.refetch();
      void playtime.refetch();
    },
  };
}
