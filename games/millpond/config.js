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
  },
  camera: {
    fov: 50,
    minDistance: 4,
    maxDistance: 26,
    // The camera never looks from below this angle (0 = straight down,
    // 0.5 = level with the board), so it never dips under the water.
    maxPolar: 0.44,
  },
  // The colours of the marks on the board.
  marks: {
    free: '#fff3b0', // a free point while placing
    target: '#7dff9a', // where the chosen piece may go
    select: '#ffe14a', // the chosen piece
    remove: '#ff6a5a', // a piece that may be removed
    last: '#ffb84a', // the last move
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
