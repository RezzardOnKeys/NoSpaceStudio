// Blockchess – every number that can be tuned, in one place.

export const CONFIG = {
  ai: {
    // How deep the computer looks (half moves) and how much chance it adds
    // to its scores (in hundredths of a pawn). More noise = more mistakes.
    levels: {
      1: { depth: 1, noise: 80 },
      2: { depth: 2, noise: 15 },
      3: { depth: 3, noise: 4 },
    },
    // The computer "thinks" at least this long, so its move does not appear
    // at the very moment the own piece lands.
    minThinkMs: 450,
  },
  anim: {
    // A piece walks for walkBase + walkPerSquare * distance seconds.
    walkBase: 0.45,
    walkPerSquare: 0.12,
    // A captured piece vanishes this long after the attacker sets off.
    vanishDelay: 0.3,
    vanishTime: 0.25,
    puffTime: 0.7,
    // The camera swings round to a side in this many seconds.
    cameraTurn: 1.1,
  },
  camera: {
    fov: 55,
    minDistance: 2.5,
    maxDistance: 45,
    flySpeed: 9, // metres per second with WASD
  },
  // The colours of the marks on the board: [colour, opacity].
  marks: {
    last: ['#ffb84a', 0.35],
    select: ['#ffe84a', 0.55],
    capture: ['#ff3b30', 0.5],
    check: ['#ff1a1a', 0.6],
  },
  // "Resign" must be clicked twice within this time.
  resignConfirmMs: 3000,
};

export const SIDE_NAMES = { w: 'White', b: 'Black' };
export const TEAM_NAMES = { w: 'Village Guard', b: 'Cave Folk' };
