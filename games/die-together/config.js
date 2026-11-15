// Die Together – shared numbers and colours.
// Everything that defines the rules lives here, so it is easy to tune.

/** The party limit of the launcher: 4 characters with 2 players each. */
export const MAX_PLAYERS = 8;

/** The characters ("teams" in the menu). Each one is steered by two players. */
export const TEAMS = [
  { name: 'Red', hex: '#ff4b4b' },
  { name: 'Blue', hex: '#3f82ff' },
  { name: 'Yellow', hex: '#ffd23a' },
  { name: 'Green', hex: '#3fd16a' },
];

/** The two seats of a character and what the menu calls them. */
export const SEATS = [
  { id: 'mouse', label: 'Mouse', icon: '🖱️', does: 'look, aim, shoot' },
  { id: 'keyboard', label: 'Keyboard', icon: '⌨️', does: 'walk, jump, reload' },
];

// ---- The character's body and how it moves (world units, seconds) --------
export const PLAYER_R = 0.45; // radius of the body, seen from above
export const PLAYER_H = 1.6; // height from feet to the top of the head
export const EYE_H = 1.4; // the camera sits this high above the feet
export const SPEED = 5.5; // walking speed
export const JUMP_V = 7.5; // upward speed of a jump; reaches about 1.4 high
export const GRAVITY = 20;
/** Edges up to this height are simply walked up (ramps, small ledges). */
export const STEP_UP = 0.35;
/** The view cannot tilt further up or down than this (radians, about 86°). */
export const MAX_PITCH = 1.5;

// ---- Network pace ----------------------------------------------------------
export const STATE_MS = 50; // the referee sends the state 20 times per second
export const LOOK_MS = 33; // a mouse player sends the view at most this often

// ---- The arena -------------------------------------------------------------
/** Half the side length: the floor reaches from -15 to +15 on both axes. */
export const ARENA_HALF = 15;
export const WALL_H = 6;

/** Where characters start: the corners, opposite ones first. */
export const SPAWNS = [
  { x: 12, z: 12 },
  { x: -12, z: -12 },
  { x: 12, z: -12 },
  { x: -12, z: 12 },
];

// Obstacles are boxes standing on the floor: centre (x, z), size w (along x)
// and d (along z), height h. A "ramp" rises from 0 to h in direction `dir`.
// The pieces of one quarter are repeated in all four quarters, so every
// corner has the same cover.
const QUARTER = [
  { kind: 'wall', x: 9, z: 11.5, w: 0.6, d: 4, h: 2.4 }, // shields the start corner
  { kind: 'crate', x: 7.5, z: 5.5, w: 2, d: 2, h: 2 }, // too high to jump on ...
  { kind: 'crate', x: 9.25, z: 5.5, w: 1.5, d: 1.5, h: 1 }, // ... except from this one
  { kind: 'pillar', x: 3.5, z: 12, w: 1, d: 1, h: 4 },
  { kind: 'wall', x: 11, z: 4, w: 4, d: 0.6, h: 1.2 }, // low: you can shoot over it
  { kind: 'crate', x: 13, z: 7.5, w: 1.5, d: 1.5, h: 1 },
];

/** Turns a piece by a quarter turn around the middle of the arena. */
const turned = (o) => ({ ...o, x: -o.z, z: o.x, w: o.d, d: o.w });

function allQuarters() {
  const out = [];
  for (let piece of QUARTER) {
    for (let i = 0; i < 4; i++) {
      out.push(piece);
      piece = turned(piece);
    }
  }
  return out;
}

export const MAP = [
  ...allQuarters(),
  // The middle, where the last fight happens: only small cover.
  { kind: 'crate', x: 0, z: 0, w: 1.6, d: 1.6, h: 1 },
  { kind: 'wall', x: 0, z: 3.5, w: 2.4, d: 0.6, h: 1.6 },
  { kind: 'wall', x: 0, z: -3.5, w: 2.4, d: 0.6, h: 1.6 },
  { kind: 'pillar', x: 9.5, z: 0, w: 1, d: 1, h: 4 },
  { kind: 'pillar', x: -9.5, z: 0, w: 1, d: 1, h: 4 },
  // Two low platforms, each with a ramp leading up.
  { kind: 'platform', x: 0, z: 8.5, w: 5, d: 3, h: 1.2 },
  { kind: 'ramp', x: 4.25, z: 8.5, w: 3.5, d: 3, h: 1.2, dir: '-x' },
  { kind: 'platform', x: 0, z: -8.5, w: 5, d: 3, h: 1.2 },
  { kind: 'ramp', x: -4.25, z: -8.5, w: 3.5, d: 3, h: 1.2, dir: '+x' },
];

/** How high the top of an obstacle is at the point (x, z) on it. */
export function surfaceTop(o, x, z) {
  if (o.kind !== 'ramp') return o.h;
  let t; // 0 at the low end of the ramp, 1 at the high end
  if (o.dir === '+x') t = (x - (o.x - o.w / 2)) / o.w;
  else if (o.dir === '-x') t = (o.x + o.w / 2 - x) / o.w;
  else if (o.dir === '+z') t = (z - (o.z - o.d / 2)) / o.d;
  else t = (o.z + o.d / 2 - z) / o.d;
  return o.h * Math.min(1, Math.max(0, t));
}
