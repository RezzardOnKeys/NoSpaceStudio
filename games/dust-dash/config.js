// Dust Dash – every number that can be tuned, in one place.
// Units: metres, seconds, metres per second.
export const CONFIG = {
  hall: {
    width: 56, // along x
    depth: 36, // along z
    height: 6, // up to the roof beams
  },
  // ── Walking ─────────────────────────────────────────────────
  move: {
    radius: 0.4, // body radius for collisions
    walkSpeed: 7, // while not vacuuming
    vacuumSpeed: 4.2, // while vacuuming: slower, so running to a delivery costs dirt
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
  // ── Vacuuming ───────────────────────────────────────────────
  vacuum: {
    reach: 1.6, // the nozzle takes dirt up to this far in front of the player
    width: 1.2, // and this wide (half of it to each side)
    flyTime: 0.2, // a piece from the far end flies this long into the nozzle
  },
  // ── Dirt ────────────────────────────────────────────────────
  dirt: {
    pieces: 11500, // how many pieces lie in the hall at the start
    patches: 46, // extra dirty spots, placed by the seed
    filmTexels: 8, // resolution of the dust film on the floor, per metre
    botCell: 2, // size of the squares in which the bot counts the dirt left
  },
  // ── Deliveries ──────────────────────────────────────────────
  delivery: {
    first: 25, // seconds until the first box drops
    every: 35, // seconds from opening a box to the next one
    fallTime: 1.5, // how long a box falls from the roof
    touch: 1.2, // a player this close to a landed box opens it
    minDistance: 9, // a box never drops closer than this (walking) to a player
    fairness: 2, // the walking distances of the players differ by at most this, if possible
  },
  // ── Power-ups (one at a time, a new one replaces the old one) ─
  power: {
    time: 10, // seconds a power-up lasts
    wideWidth: 2, // wide nozzle: the area is this many times as wide
    turboSpeed: 1.45, // turbo shoes: walking is this many times as fast
    strongReach: 3.2, // strong suction: reach in metres (instead of vacuum.reach)
    strongWidth: 1.35, // ... and this many times as wide
    goldPoints: 2, // golden nozzle: points per piece
  },
  // ── The bot (alone only). It plays by the same rules as a player; these
  //    numbers make it weaker or stronger. ──────────────────────────────
  bot: {
    turnRate: 2.4, // how fast it turns, radians per second (a player's mouse is faster)
    sight: 3.0, // it sees single pieces of dirt up to this far (metres)
    rest: 1.8, // seconds it stands still before walking on to a new dirty area
    workFor: 5, // after this many seconds of vacuuming without a stop it takes a breather
    breather: 2.2, // ... of this many seconds
    boxAgain: 4, // while a box lies there, it thinks again every this many seconds
    reaction: 0.6, // seconds until it notices a delivery
    boxBias: 1.15, // it runs for a box if its way is at most this many times the player's
    sprintFrom: 7, // further than this from the box it stops vacuuming to run faster
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

// The four power-ups, in the order of their numbers (0 to 3) in the rules.
export const POWERS = ['Wide nozzle', 'Turbo shoes', 'Strong suction', 'Golden nozzle'];
export const POWER = { WIDE: 0, TURBO: 1, STRONG: 2, GOLD: 3 };

// The rules run in fixed steps, 60 per second, no matter how fast the screen is.
export const STEP = 1 / 60;

// Party match: how often the host sends the state of the match to the
// guest and how often the guest sends its keys to the host (milliseconds).
export const SNAP_MS = 33;
export const INPUT_MS = 33;
