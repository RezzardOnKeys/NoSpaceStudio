// Inkwars – every number that can be tuned, in one place.
// Units: metres, seconds, metres per second.
export const CONFIG = {
  arena: {
    width: 56,
    depth: 36,
    texelsPerMeter: 8, // resolution of the colour mask
  },
  // ── Movement ────────────────────────────────────────────────
  move: {
    gravity: 22,
    radius: 0.4, // body radius for collisions
    stepHeight: 0.4, // edges up to this height are walked up without a jump
    coyoteTime: 0.1, // for this long you may still jump after running off an edge
    morphTime: 0.14, // time the change human <-> fish takes
    // human form
    human: { maxSpeed: 6.2, accel: 26, decel: 22, jumpSpeed: 7.4 },
    // fish form in own water: fast, glides on for a long time
    fishInk: { maxSpeed: 12.5, accel: 30, decel: 7, jumpSpeed: 8.2 },
    // fish form on dry ground: only flops around
    fishDry: { maxSpeed: 2.0, accel: 12, decel: 16, jumpSpeed: 4.0 },
    fishJumpBoost: 1.12, // extra momentum when jumping out of own water
    enemyInkFactor: 0.4, // speed factor in enemy water
    airAccel: 9, // how much you can steer in the air
    airMaxSpeed: 6.2, // up to this speed you can accelerate in the air
    climbSpeed: 7, // swimming up a wall
    fishTurnRate: 12, // how fast the fish turns into its direction of travel
  },
  // ── Water pistol ────────────────────────────────────────────
  weapon: {
    tank: 100,
    shotCost: 2.2,
    fireInterval: 0.1,
    speed: 22,
    gravity: 18,
    spread: 0.035,
    damage: 22,
    floorRadius: 1.15, // splat at the impact
    wallRadius: 0.9,
    dripRadius: 0.5, // trail of drips under the flight path
    dripInterval: 0.1,
    refillPerSec: 50,
    maxLife: 2.5,
    aimRange: 18, // up to this distance the drop of the water is compensated
  },
  actor: {
    hp: 100,
    regenDelay: 3,
    regenPerSec: 40,
    respawnTime: 3,
    invulnTime: 1.5,
  },
  match: {
    duration: 180,
    countdown: 3,
  },
  camera: {
    fov: 62,
    distHuman: 5.0,
    distFish: 6.2,
    heightHuman: 1.6,
    heightFish: 0.9,
    shoulder: 0.9,
    follow: 16, // the higher, the more directly the camera follows
    mouseSens: 0.0023,
    keyTurn: 2.2,
  },
};

// The eight water colours a player can pick, in the order of the menu.
export const PALETTE = [
  { hex: 0xff2d95, name: 'Pink' },
  { hex: 0xff8a00, name: 'Orange' },
  { hex: 0xffd400, name: 'Yellow' },
  { hex: 0x7ddc1f, name: 'Lime' },
  { hex: 0x00cfc1, name: 'Teal' },
  { hex: 0x2f7bff, name: 'Blue' },
  { hex: 0x9b4dff, name: 'Purple' },
  { hex: 0xff3b30, name: 'Red' },
];

// The rules run in fixed steps, 60 per second, no matter how fast the screen is.
export const STEP = 1 / 60;

// Party match: how often the host sends the state of the match to the guest
// and how often the guest sends its keys and aim to the host (milliseconds).
export const SNAP_MS = 33;
export const INPUT_MS = 33;
