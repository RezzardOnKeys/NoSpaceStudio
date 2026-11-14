import type { Game } from '@/types/models';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
  { value: 'most-played', label: 'Most played' },
] as const;

export type StoreSort = (typeof SORT_OPTIONS)[number]['value'];

export const DEFAULT_SORT: StoreSort = 'newest';

export function isStoreSort(value: string | null): value is StoreSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export interface StoreFilterState {
  query: string;
  /** A game must have ALL selected genres. */
  genres: string[];
  engine: string | null;
  sort: StoreSort;
}

const sorters: Record<StoreSort, (a: Game, b: Game) => number> = {
  newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  az: (a, b) => a.title.localeCompare(b.title),
  'most-played': (a, b) => b.totalPlaytimeSeconds - a.totalPlaytimeSeconds,
};

export function filterGames(games: Game[], filters: StoreFilterState): Game[] {
  const query = filters.query.trim().toLowerCase();

  return games
    .filter((game) => {
      if (query && !game.title.toLowerCase().includes(query)) return false;
      if (filters.engine && game.engine !== filters.engine) return false;
      return filters.genres.every((genre) => game.genres.includes(genre));
    })
    .sort(sorters[filters.sort]);
}

/** All values of one kind that occur in the catalogue, sorted A–Z. */
export function collectGenres(games: Game[]): string[] {
  return [...new Set(games.flatMap((game) => game.genres))].sort();
}

export function collectEngines(games: Game[]): string[] {
  return [...new Set(games.map((game) => game.engine))].sort();
}
