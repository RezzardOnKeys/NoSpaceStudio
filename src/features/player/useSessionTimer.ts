import { useEffect, useState } from 'react';

/**
 * Counts the seconds of the current play session. The clock only runs while
 * the tab is visible, so time in a background tab is not counted.
 */
export function useSessionTimer(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setSeconds((current) => current + 1);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return seconds;
}
