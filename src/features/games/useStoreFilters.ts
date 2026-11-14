import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DEFAULT_SORT, isStoreSort, type StoreFilterState, type StoreSort } from './store-filters';

interface StoreFilters extends StoreFilterState {
  /** True when anything narrows the list (sorting does not count). */
  isFiltering: boolean;
  toggleGenre: (genre: string) => void;
  setEngine: (engine: string | null) => void;
  setSort: (sort: StoreSort) => void;
  clear: () => void;
}

/**
 * Store filters, kept in the URL (?q=&genre=&engine=&sort=). That makes a
 * filtered view shareable and keeps it when navigating back from a game.
 */
export function useStoreFilters(): StoreFilters {
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const genreParam = params.getAll('genre').join('|');
  const genres = useMemo(() => (genreParam ? genreParam.split('|') : []), [genreParam]);
  const engine = params.get('engine');
  const sortParam = params.get('sort');
  const sort = isStoreSort(sortParam) ? sortParam : DEFAULT_SORT;

  const update = useCallback(
    (change: (next: URLSearchParams) => void) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          change(next);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setParams],
  );

  const toggleGenre = useCallback(
    (genre: string) =>
      update((next) => {
        const selected = next.getAll('genre');
        next.delete('genre');
        const updated = selected.includes(genre)
          ? selected.filter((item) => item !== genre)
          : [...selected, genre];
        updated.forEach((item) => next.append('genre', item));
      }),
    [update],
  );

  const setEngine = useCallback(
    (value: string | null) =>
      update((next) => {
        if (value) next.set('engine', value);
        else next.delete('engine');
      }),
    [update],
  );

  const setSort = useCallback(
    (value: StoreSort) =>
      update((next) => {
        if (value === DEFAULT_SORT) next.delete('sort');
        else next.set('sort', value);
      }),
    [update],
  );

  const clear = useCallback(
    () =>
      update((next) => {
        next.delete('q');
        next.delete('genre');
        next.delete('engine');
      }),
    [update],
  );

  return {
    query,
    genres,
    engine,
    sort,
    isFiltering: query.trim() !== '' || genres.length > 0 || engine !== null,
    toggleGenre,
    setEngine,
    setSort,
    clear,
  };
}
