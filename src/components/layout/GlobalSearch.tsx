import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import { paths } from '@/routes/paths';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Search field in the top bar. The search text lives in the store URL
 * (?q=...), so typing from any page jumps to the store and filters it live.
 */
export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const onStore = location.pathname === paths.store;
  const value = onStore ? (searchParams.get('q') ?? '') : '';

  // Pressing "/" anywhere focuses the search.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleChange(text: string) {
    // Keep the other store filters when we are already on the store.
    const next = new URLSearchParams(onStore ? searchParams : undefined);
    if (text) next.set('q', text);
    else next.delete('q');
    void navigate({ pathname: paths.store, search: next.toString() }, { replace: onStore });
  }

  return (
    <div className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search games"
        aria-label="Search games"
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line bg-surface-raised pr-10 pl-9 text-sm text-fg transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 hidden h-5 -translate-y-1/2 items-center rounded border border-line-strong px-1.5 font-mono text-xs text-fg-subtle sm:flex"
      >
        /
      </kbd>
    </div>
  );
}
