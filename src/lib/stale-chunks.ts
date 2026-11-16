/**
 * Recovers from a page file that no longer exists on the server.
 *
 * Pages are separate files whose names change with every release. If a
 * player keeps the launcher open while a new version goes live and then
 * opens a page they had not visited yet, the browser asks for the old file
 * name and gets nothing. Vite reports this as "vite:preloadError"; we then
 * reload once, which fetches the new version.
 *
 * The time of the last reload is kept for this tab, so a file that is
 * really broken shows an error instead of reloading forever.
 */

const STORAGE_KEY = 'stale-chunk-reload-at';
const MIN_GAP_MS = 10_000;

function readLastReload(): number {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastReload(time: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // Storage blocked (private mode): the reload still works, only the guard is lost.
  }
}

/** Call once at start-up. */
export function reloadOnStaleChunks() {
  window.addEventListener('vite:preloadError', (event) => {
    const now = Date.now();
    if (now - readLastReload() < MIN_GAP_MS) return;
    event.preventDefault();
    writeLastReload(now);
    window.location.reload();
  });
}
