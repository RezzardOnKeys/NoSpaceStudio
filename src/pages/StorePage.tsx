import { Gamepad2, SearchX } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FeaturedHero, FeaturedHeroSkeleton } from '@/features/games/FeaturedHero';
import { GameCard, GameCardSkeleton } from '@/features/games/GameCard';
import { GameGrid } from '@/features/games/GameGrid';
import { useGames } from '@/features/games/queries';
import { collectEngines, collectGenres, filterGames } from '@/features/games/store-filters';
import { StoreFilterBar } from '@/features/games/StoreFilterBar';
import { useStoreFilters } from '@/features/games/useStoreFilters';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const SKELETON_COUNT = 10;

export function StorePage() {
  useDocumentTitle('Store');
  const { data: games, isPending, isError, refetch } = useGames();
  const filters = useStoreFilters();
  const { query, genres, engine, sort } = filters;

  const visibleGames = useMemo(
    () => filterGames(games ?? [], { query, genres, engine, sort }),
    [games, query, genres, engine, sort],
  );
  const featured = useMemo(() => (games ?? []).filter((game) => game.isFeatured), [games]);

  if (isError) {
    return <ErrorState title="We could not load the games" onRetry={() => void refetch()} />;
  }

  const trimmedQuery = query.trim();
  const heading = trimmedQuery ? `Results for “${trimmedQuery}”` : 'All games';

  return (
    <div className="flex flex-col gap-10">
      <h1 className="sr-only">Store</h1>

      {/* The hero steps aside while someone is searching or filtering. */}
      {!filters.isFiltering &&
        (isPending ? <FeaturedHeroSkeleton /> : <FeaturedHero games={featured} />)}

      <section aria-labelledby="all-games-heading" className="flex flex-col gap-5">
        <div className="flex items-baseline gap-3">
          <h2 id="all-games-heading" className="text-xl font-semibold">
            {heading}
          </h2>
          {!isPending && (games?.length ?? 0) > 0 && (
            <span className="text-sm text-fg-subtle" aria-live="polite">
              {visibleGames.length} {visibleGames.length === 1 ? 'game' : 'games'}
            </span>
          )}
        </div>

        {games && games.length > 0 && (
          <StoreFilterBar
            genres={collectGenres(games)}
            engines={collectEngines(games)}
            selectedGenres={genres}
            selectedEngine={engine}
            sort={sort}
            isFiltering={filters.isFiltering}
            onToggleGenre={filters.toggleGenre}
            onEngineChange={filters.setEngine}
            onSortChange={filters.setSort}
            onClear={filters.clear}
          />
        )}

        {isPending ? (
          <GameGrid busy>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <GameCardSkeleton key={index} />
            ))}
          </GameGrid>
        ) : visibleGames.length > 0 ? (
          <GameGrid>
            {visibleGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </GameGrid>
        ) : filters.isFiltering ? (
          <EmptyState
            icon={<SearchX />}
            title="No games match your filters"
            description="Try a different search term or remove a filter to see more games."
            action={
              <Button variant="secondary" onClick={filters.clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Gamepad2 />}
            title="No games yet"
            description="The first games are on their way. Check back soon."
          />
        )}
      </section>
    </div>
  );
}
