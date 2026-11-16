import { type ComponentType, lazy } from 'react';

/**
 * Loads a page only when it is opened for the first time, so the first
 * visit downloads just the frame and the current page instead of the whole
 * app. Pages use named exports; React's lazy() needs a default export, so
 * this picks the named one.
 *
 * Example: const StorePage = lazyPage(() => import('@/pages/StorePage'), 'StorePage');
 *
 * A <Suspense> around the page's <Outlet> shows PageFallback while it loads.
 */
export function lazyPage<Name extends string, Props extends object>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name,
) {
  return lazy(async () => ({ default: (await load())[name] }));
}
