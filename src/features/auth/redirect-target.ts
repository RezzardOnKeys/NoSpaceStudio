import { paths } from '@/routes/paths';

/** Router state that remembers where a guest wanted to go before signing in. */
export interface RedirectState {
  from: string;
}

/** The page to open after signing in. Falls back to the store. */
export function readRedirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    // Only in-app paths, never another site.
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return paths.store;
}
