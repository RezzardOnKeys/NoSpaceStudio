/** Without any mouse, keyboard or touch input for this long, a player counts as away. */
export const IDLE_MS = 5 * 60_000;
/** A hidden tab (another tab in front, window minimised) counts as away after this long. */
export const HIDDEN_GRACE_MS = 30_000;

/** Last moment the player was active in any launcher tab of this browser. */
const SHARED_KEY = 'nss-presence-active-at';

export interface ActivityTracker {
  /** True while the player is really here (see createActivityTracker). */
  isActive(now?: number): boolean;
  /** Inside a game: a focused window counts as activity (the game gets the input). */
  markFocusedActive(): void;
  /** Was the player active in another launcher tab of this browser a moment ago? */
  activeElsewhere(now?: number): boolean;
  /** Stops listening to the input. */
  stop(): void;
}

/**
 * Tells whether the player is really using the launcher right now: the tab
 * is visible (or was hidden only a moment ago) and somebody used the mouse,
 * the keyboard or a touch screen in the last few minutes.
 *
 * Inside a game the input goes to the game's frame, which the launcher
 * cannot see (the game runs on another origin). There, having the browser
 * window focused counts as being active (`markFocusedActive`).
 */
export function createActivityTracker(): ActivityTracker {
  let lastInput = Date.now();
  let hiddenSince: number | null = document.visibilityState === 'hidden' ? Date.now() : null;
  let lastShared = 0;

  function share(now: number) {
    // Telling other tabs costs a little; once every few seconds is enough.
    if (now - lastShared < 5000) return;
    lastShared = now;
    try {
      window.localStorage.setItem(SHARED_KEY, String(now));
    } catch {
      // Private mode or blocked storage: other tabs simply do not know about this one.
    }
  }
  function mark() {
    lastInput = Date.now();
    share(lastInput);
  }
  function visibility() {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
    } else {
      hiddenSince = null;
      mark();
    }
  }

  const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
  for (const name of events) window.addEventListener(name, mark, { passive: true });
  window.addEventListener('focus', mark);
  document.addEventListener('visibilitychange', visibility);

  return {
    isActive(now = Date.now()) {
      if (hiddenSince !== null && now - hiddenSince > HIDDEN_GRACE_MS) return false;
      return now - lastInput < IDLE_MS;
    },
    markFocusedActive() {
      if (document.visibilityState === 'visible' && document.hasFocus()) mark();
    },
    activeElsewhere(now = Date.now()) {
      try {
        const other = Number(window.localStorage.getItem(SHARED_KEY) ?? 0);
        // Only another tab can have written a time later than this tab's own input.
        return other > lastInput && now - other < 15_000;
      } catch {
        return false;
      }
    },
    stop() {
      for (const name of events) window.removeEventListener(name, mark);
      window.removeEventListener('focus', mark);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
