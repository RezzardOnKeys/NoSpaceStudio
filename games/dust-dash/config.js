// Dust Dash – every number that can be tuned, in one place.
// Units: metres, seconds, metres per second.
export const CONFIG = {
  hall: {
    width: 40, // along x
    depth: 26, // along z
    height: 6, // up to the roof beams
  },
  // ── Walking ─────────────────────────────────────────────────
  move: {
    radius: 0.4, // body radius for collisions
    walkSpeed: 7, // while not vacuuming
    vacuumSpeed: 5, // while vacuuming: slower, so running to a delivery costs dirt
    // accel: how fast the speed follows the keys (also when turning);
    // decel: how fast the character stops after letting go of the keys.
    accel: 70,
    decel: 80,
    eyeHeight: 1.55, // the camera's height above the floor
  },
  // ── Looking around ──────────────────────────────────────────
  look: {
    fov: 75,
    mouseSens: 0.0023,
    keyTurn: 2.2, // arrow keys, radians per second
  },
  match: {
    duration: 240, // a round lasts four minutes
    countdown: 3, // 3-2-1 before the start
  },
};

// How many players a match has. Players are a list everywhere, so more
// players (or more bots) later only need this number, the menu and
// "maxPlayers" in game.json.
export const MAX_PLAYERS = 2;

// The eight colours a player can pick for their vacuum and character, in
// the order of the menu.
export const PALETTE = [
  { hex: 0xe8554e, name: 'Tomato' },
  { hex: 0xf08a24, name: 'Orange' },
  { hex: 0xf2c230, name: 'Honey' },
  { hex: 0x7fbf3f, name: 'Leaf' },
  { hex: 0x2fb5a5, name: 'Teal' },
  { hex: 0x3f8fe0, name: 'Sky' },
  { hex: 0x8a63d8, name: 'Plum' },
  { hex: 0xe86aa6, name: 'Rose' },
];

// The rules run in fixed steps, 60 per second, no matter how fast the screen is.
export const STEP = 1 / 60;

// Party match: how often the host sends the state of the match to the
// guest (milliseconds).
export const SNAP_MS = 33;
