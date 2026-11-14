import { useCallback, useEffect, useState, type RefObject } from 'react';

interface Fullscreen {
  isFullscreen: boolean;
  /** False on browsers without the Fullscreen API (e.g. iPhone Safari). */
  isSupported: boolean;
  toggle: () => void;
}

/** Puts the referenced element into fullscreen and tracks the state. */
export function useFullscreen(ref: RefObject<HTMLElement | null>): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement !== null);
    }
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      // Can be rejected (e.g. blocked by the browser); staying windowed is fine.
      ref.current?.requestFullscreen().catch(() => undefined);
    }
  }, [ref]);

  return { isFullscreen, isSupported: document.fullscreenEnabled, toggle };
}
