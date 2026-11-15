// Blind Drop – shared numbers and colours.
// Everything that defines the rules lives here, so it is easy to tune.

/** How many players a match can have right now. The code works with a list
 *  of players everywhere, so raising this (up to the 8 colours) is enough to
 *  allow free-for-all matches later. Also raise "maxPlayers" in game.json. */
export const MAX_PLAYERS = 2;

/** Radius of the island at the start of a Classic match (world units). The
 *  island model is built at this size; every other size is a scaled copy. */
export const ISLAND_R = 10;
/** Explosion sizes the host can pick in the lobby (radius in world units). */
export const BLAST_SIZES = {
  small: { label: 'Small', r: 1 },
  medium: { label: 'Medium', r: 2 },
  large: { label: 'Large', r: 3 },
};
export const DEFAULT_BLAST = 'medium';

/** Game modes the host can pick in the lobby.
 *  classic: the island shrinks after every round without a hit.
 *  snipe:   tiny blast, the island never shrinks; a match can take very long. */
export const MODES = {
  classic: { label: 'Classic', hint: 'The island shrinks until someone is hit.' },
  snipe: { label: 'Snipe', hint: 'Tiny blast. The island never shrinks. Aim well!' },
};
export const DEFAULT_MODE = 'classic';
/** Snipe: fixed island radius and fixed blast radius. */
export const SNIPE_ISLAND_R = 8;
export const SNIPE_BLAST_R = 1;
/** Island radius at the start of a match in the given mode. */
export const startRadius = (mode) => (mode === 'snipe' ? SNIPE_ISLAND_R : ISLAND_R);
/** The island loses this much radius after every round without a hit ... */
export const SHRINK_STEP = 1.1;
/** ... down to this size. It is a bit smaller than a blast, so a bomb in the
 *  middle covers the whole island and a match cannot go on forever. */
export const minIslandR = (blastR) => blastR * 0.85;

/** Walking speed in units per second. */
export const SPEED = 4.2;
/** Players stay this far away from the edge (their body radius). */
export const PLAYER_R = 0.45;

// Length of the phases in milliseconds.
export const LOOK_MS = 3000; // everybody visible, nobody can act
export const ACTION_MS = 5000; // opponents invisible, walk and drop the bomb
export const COLLECT_MS = 700; // host waits this long for the last positions
export const REVEAL_MS = 3200; // reveal, bombs fall, explosions
export const SHRINK_MS = 1700; // island shrinks, players are teleported
export const MISS_MS = 900; // Snipe: short pause after a round without a hit

// Moments inside the reveal (milliseconds after it starts).
export const DROP_AT = 700; // bombs appear in the sky
export const FALL_MS = 900; // and take this long to land

/** The colours a player can choose. Green is missing on purpose: the grass is green. */
export const COLORS = [
  { name: 'Red', hex: '#ff4b4b' },
  { name: 'Orange', hex: '#ff9a2e' },
  { name: 'Yellow', hex: '#ffe03a' },
  { name: 'Teal', hex: '#1fe0c4' },
  { name: 'Blue', hex: '#3f82ff' },
  { name: 'Purple', hex: '#a45bff' },
  { name: 'Pink', hex: '#ff62c6' },
  { name: 'White', hex: '#f6f3ff' },
];

/** Where players stand when a match starts: evenly spread on a circle half
 *  way between the middle and the edge of the island. */
export function spawnPoint(index, count, radius) {
  const angle = Math.PI + (index * Math.PI * 2) / Math.max(count, 1);
  return { x: Math.cos(angle) * radius * 0.5, z: Math.sin(angle) * radius * 0.5 };
}

/** Moves a point back onto the island if it is outside (nearest point). */
export function clampToIsland(x, z, radius, margin = 0) {
  const max = Math.max(radius - margin, 0);
  const d = Math.hypot(x, z);
  if (d <= max || d === 0) return { x, z };
  return { x: (x / d) * max, z: (z / d) * max };
}
