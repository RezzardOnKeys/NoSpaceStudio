import { X } from 'lucide-react';

import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';

import { isStoreSort, SORT_OPTIONS, type StoreSort } from './store-filters';

interface StoreFilterBarProps {
  genres: string[];
  engines: string[];
  selectedGenres: string[];
  selectedEngine: string | null;
  sort: StoreSort;
  isFiltering: boolean;
  onToggleGenre: (genre: string) => void;
  onEngineChange: (engine: string | null) => void;
  onSortChange: (sort: StoreSort) => void;
  onClear: () => void;
}

export function StoreFilterBar({
  genres,
  engines,
  selectedGenres,
  selectedEngine,
  sort,
  isFiltering,
  onToggleGenre,
  onEngineChange,
  onSortChange,
  onClear,
}: StoreFilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="text-fg-subtle float-left mr-1 text-sm">Genre</legend>
          {genres.map((genre) => (
            <Chip
              key={genre}
              selected={selectedGenres.includes(genre)}
              onClick={() => onToggleGenre(genre)}
            >
              {genre}
            </Chip>
          ))}
        </fieldset>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="text-fg-subtle float-left mr-1 text-sm">Engine</legend>
          {engines.map((engine) => (
            <Chip
              key={engine}
              selected={selectedEngine === engine}
              onClick={() => onEngineChange(selectedEngine === engine ? null : engine)}
            >
              {engine}
            </Chip>
          ))}
          {isFiltering && (
            <button
              type="button"
              onClick={onClear}
              className="text-fg-muted hover:text-fg ml-1 inline-flex h-8 items-center gap-1 rounded-full px-2 text-sm font-medium transition-colors"
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </fieldset>
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) => {
            if (isStoreSort(event.target.value)) onSortChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
