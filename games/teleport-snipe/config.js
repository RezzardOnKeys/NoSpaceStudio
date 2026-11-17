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
    eyeHeight: 1.6, // the camera's height above the feet when standing
    crouchEyeHeight: 1.0, // ... and when crouching
    crouchBlend: 14, // how fast the camera moves down and up when crouching (per second)
    stepSmooth: 22, // how fast the camera follows a step up or down (per second)
  },
  // ── Moving: quick to start and stop, strong control in the air ──
  move: {
    radius: 0.35, // half the width of the body (the body is a square column)
    height: 1.75, // body height when standing
    crouchHeight: 1.15, // ... when crouching (fits behind the low stone walls)
    runSpeed: 7.5,
    crouchSpeed: 3,
    accel: 75, // on the ground: how fast the speed follows the keys
    decel: 65, // on the ground: how fast the player stops without keys
    airAccel: 38, // in the air: how strongly the keys still steer
    gravity: 24, // high gravity: jumps land fast
    jumpHeight: 1.3, // highest point of a jump
    maxFall: 30, // fastest fall speed
    stepUp: 0.5, // steps up to this height are walked up by themselves
    stepDown: 0.55, // walking down steps up to this height keeps the feet on the ground
  },
  // ── Sliding: crouch while running ──────────────────────────────
  slide: {
    startSpeed: 11, // speed at the start of a slide
    endSpeed: 3, // after `time` seconds it has slowed down to crouch walking
    time: 0.8,
    cooldown: 1, // at most one slide per second
    minSpeed: 5, // only when running at least this fast
    steer: 2.5, // how much the keys bend the slide (radians per second)
  },
  // ── The rifle ───────────────────────────────────────────────
  rifle: {
    reload: 1, // seconds after every shot (a fixed rule of the game, not for tuning)
    zoomFov: 22, // field of view when fully zoomed in
    zoomIn: 0.12, // seconds to zoom in ...
    zoomOut: 0.08, // ... and out
    zoomSpeed: 0.55, // moving speed while zoomed, as a share of the normal speed
    spread: 7, // without zoom a shot goes up to this many degrees off the crosshair
    range: 150, // metres; nothing in the garden is further away
    // The body that a shot can hit is a little wider and higher than the
    // body that bumps into walls, so it matches the coat and the hat.
    hitRadius: 0.42,
    hitExtra: 0.15,
    kick: 0.03, // recoil: the view jumps up this far (radians) and settles again
    kickBack: 14, // how fast it settles (per second)
    tracerTime: 0.4, // seconds a tracer line takes to fade out
    hitMarkerTime: 0.3,
  },
  // ── Teleports after a miss ──────────────────────────────────
  teleport: {
    minDistance: 1.5, // never land closer than this to the other player (metres)
    flashTime: 0.6, // the column of light fades in and out within this time
    flashHeight: 3, // high enough to be seen above low cover
    petals: 7, // cherry petals whirling in each flash
  },
  // ── Rounds and the match ────────────────────────────────────
  match: {
    countdown: 3, // seconds before a round: look around, no moving or shooting
    roundsToWin: 3, // first to this many won rounds wins the match
    slowmo: 1.5, // seconds of slow motion after the hit that ends a round
    slowmoSpeed: 0.25, // the game runs at this share of its speed in slow motion
    cardTime: 2.5, // seconds the round card is shown before the next round
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

// The rules run in fixed steps, 60 per second, no matter how fast the screen is.
export const STEP = 1 / 60;

// How many players a match has: always one against one.
export const MAX_PLAYERS = 2;

// Party match: how often the host sends the state of the match to the guest
// (milliseconds, about 30 times per second).
export const SNAP_MS = 33;
// ... and how often the guest sends the keys of its last steps (milliseconds).
export const INPUT_MS = 33;
