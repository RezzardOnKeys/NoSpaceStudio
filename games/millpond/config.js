// Millpond – every number that can be tuned, in one place.

export const CONFIG = {
  ai: {
    // The computer "thinks" at least this long, so its move does not appear
    // at the very moment the own piece lands.
    minThinkMs: 600,
  },
  board: {
    // Distance between two neighbouring grid lines of the board (metres).
    // The board is 6 of these wide; the point (3, 3) of the grid is its middle.
    spacing: 1,
    // How close (metres) a click must be to a point to choose it.
    pickRadius: 0.48,
  },
  anim: {
    // The camera swings round to a side in this many seconds.
    cameraTurn: 1.1,
    // Placing: a piece hops from its row onto its point (seconds, metres).
    place: 0.65,
    placeHeight: 0.9,
    // Moving to a neighbouring point takes walkBase + walkPerMetre * distance
    // seconds; snails are this much slower; ladybugs make walkHops little hops.
    walkBase: 0.3,
    walkPerMetre: 0.3,
    snailSlower: 1.4,
    walkHops: 3,
    // Flying (three pieces left): a high arc.
    flyBase: 0.7,
    flyPerMetre: 0.08,
    flyHeight: 1.6,
    // A closed mill glows this long before the piece to remove is chosen.
    millGlow: 1.3,
    // A removed ladybug flies away, a removed snail slides into the pond.
    flyAway: 2.2,
    slideAway: 2.6,
    // The rows of pieces still to place: how far from the middle, and the gap between two.
    handRow: 4.55,
    handGap: 0.72,
  },
  camera: {
    fov: 50,
    minDistance: 4,
    maxDistance: 24,
    // The camera never looks from below this angle (0 = straight down,
    // 0.5 = level with the board), so it never dips under the water.
    maxPolar: 0.44,
  },
  // The island, the pond and the land round it (metres; the board's top is at height 0).
  world: {
    islandRadius: 7.5,
    islandY: -0.32, // the grass of the island
    landY: -0.3, // the meadow round the pond
    waterY: -0.75, // the surface of the pond
    floorY: -2.2, // the bottom of the pond
    pondRadius: 24,
    water: { color: '#4f9aa8', opacity: 0.62, wave: 0.025 },
    sky: { top: '#78b8e4', horizon: '#fbe3c4' },
    // The water mill stands on the shore at this angle (radians, 0 = +x).
    // After a mill on the board the wheel turns `boost` times faster for a
    // moment and slows down again over boostTime seconds.
    mill: { angle: -0.45, wheelRadius: 1.6, wheelSpeed: 0.6, boost: 6, boostTime: 2.2 },
  },
  koi: {
    count: 7,
    speed: [0.45, 0.8], // metres per second, slowest and fastest fish
    turnRate: 0.9, // radians per second
    targetStep: [0.35, 0.9], // how far round the pond the next target lies (radians)
    inner: 9.8, // fish stay this far from the middle of the island ...
    outer: 21.8, // ... and inside this circle
    millRoom: 6, // and this far from the water mill
    depth: 0.16, // how deep under the surface they swim
    curious: 3, // how many koi come to look at a splash
    rippleTime: 1.8, // seconds a ring on the water lasts
    rippleSize: 2.6, // metres a ring grows to
  },
  // The colours of the marks on the board.
  marks: {
    free: '#fff3b0', // a free point while placing
    target: '#7dff9a', // where the chosen piece may go
    select: '#ffe14a', // the chosen piece
    remove: '#ff6a5a', // a piece that may be removed
    last: '#ffb84a', // the last move
    mill: '#ffd76a', // the glow of a closed mill
  },
  // The colours of the two sides (for the simple pieces and the menu).
  colors: {
    l: '#d8362b',
    s: '#e0a64a',
  },
  // "Resign" must be clicked twice within this time.
  resignConfirmMs: 3000,
};

/** The names of the sides: the whole team and one piece. */
export const SIDE_NAMES = { l: 'Ladybugs', s: 'Snails' };
export const PIECE_NAME = { l: 'ladybug', s: 'snail' };
