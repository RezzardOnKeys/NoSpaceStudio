import { LoaderCircle } from 'lucide-react';
import { useState, type RefObject } from 'react';

import { env } from '@/config/env';
import type { Game } from '@/types/models';

/*
 * Sandbox: what the embedded game may do. Games are served from their own
 * origin, so "allow-same-origin" only gives a game access to its OWN storage
 * (needed for save games and for Unity's cache), never to the launcher's
 * login session. Not granted on purpose: popups, top-level navigation,
 * forms, modals, downloads.
 */
const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock allow-orientation-lock';

/*
 * Permissions policy: browser features the game may use. clipboard-write
 * lets a game copy a room code when a button is clicked.
 */
const ALLOW = 'fullscreen; gamepad; autoplay; clipboard-write';

interface GameFrameProps {
  game: Game;
  /** Passed to the game after "#" in its address, e.g. party details. */
  hash?: string | null;
  /** Wrapper element, used as the fullscreen target. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/** The game itself, embedded from the games origin. */
export function GameFrame({ game, hash, containerRef }: GameFrameProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 bg-black">
      {!loaded && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-fg-muted"
        >
          <LoaderCircle className="size-8 animate-spin text-accent-bright" aria-hidden="true" />
          <p className="text-sm">Loading {game.title}…</p>
        </div>
      )}
      <iframe
        src={`${env.gamesBaseUrl}/${game.gamePath}/${hash ? `#${hash}` : ''}`}
        title={game.title}
        sandbox={SANDBOX}
        allow={ALLOW}
        allowFullScreen
        // Focus the game right away so keyboard controls work without a click.
        onLoad={(event) => {
          setLoaded(true);
          event.currentTarget.focus();
        }}
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
