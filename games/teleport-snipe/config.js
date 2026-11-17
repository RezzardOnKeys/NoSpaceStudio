// Teleport Snipe – every number that can be tuned, in one place.
// Units: metres, seconds, metres per second, degrees for angles of view.
// The starting values come from docs/TELEPORT-SNIPE.md; the developers tune
// them after playing. More groups (movement, rifle, teleport, bot) are added
// here step by step while the game is built.
export const CONFIG = {
  // ── Looking around ──────────────────────────────────────────
  look: {
    fov: 80, // field of view without zoom
    mouseSens: 0.0022, // radians per pixel of mouse movement at speed 1×
    keyTurn: 2.2, // arrow keys, radians per second
    eyeHeight: 1.6, // the camera's height above the ground when standing
  },
  // ── Rounds and the match ────────────────────────────────────
  match: {
    countdown: 3, // seconds before a round: look around, no moving or shooting
    roundsToWin: 3, // first to this many won rounds wins the match
  },
};

// The six colours a player can pick for their coat, in the order of the menu.
export const PALETTE = [
  { hex: 0xe0452b, name: 'Vermilion' },
  { hex: 0xf29a1f, name: 'Amber' },
  { hex: 0x34a865, name: 'Jade' },
  { hex: 0x2f7fe0, name: 'Azure' },
  { hex: 0x9461d6, name: 'Wisteria' },
  { hex: 0xe5609d, name: 'Plum blossom' },
];

// How many players a match has: always one against one.
export const MAX_PLAYERS = 2;

// Party match: how often the host sends the state of the match to the guest
// (milliseconds, about 30 times per second).
export const SNAP_MS = 33;
