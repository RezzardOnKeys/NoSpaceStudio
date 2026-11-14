import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchGames } from '@/mocks/api';

export function useGames() {
  return useQuery({ queryKey: queryKeys.games, queryFn: fetchGames });
}

/** One game by slug. `data` is null when no published game has this slug. */
export function useGame(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.games,
    queryFn: fetchGames,
    select: (games) => games.find((game) => game.slug === slug) ?? null,
  });
}
