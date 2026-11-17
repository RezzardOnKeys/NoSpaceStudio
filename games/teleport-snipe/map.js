// Teleport Snipe – the temple garden as numbers. The garden is a square
// around the middle (x and z from -25 to +25, y is up, -z is "north").
// What it looks like is in mapView.js; this file only says where things are.
//
// Everything solid is a list of boxes that stand straight (no rotation):
// the movement rules (sim.js) collide with them, and later the shots and
// the bot's eyes use them too. Stairs are rows of boxes, each a little
// higher than the last; players walk up steps of up to 0.5 m by themselves.
//
// Layout (north is the top of the map):
//   middle      raked gravel garden with large rocks (low cover only)
//   north-west  three-storey pagoda, balcony at 3.6 m, stairs on its east side
//   east        tea house with a veranda at 1.5 m, steps on its west side
//   south-west  stepped hill (2 m) with a bell frame on top
//   south-east  koi pond with a red bridge (the pond cannot be entered)
//   around      stone lanterns, cherry trees, bamboo groves, low stone walls,
//               a torii gate, and the temple wall with its tiled roof

/** Length of one side of the garden inside the temple wall (metres). */
export const SIZE = 50;
/** Height of the temple wall around everything (too high to jump on). */
export const WALL_HEIGHT = 4;

/**
 * The solid boxes. Each one: { x0, x1, y0, y1, z0, z1, look, stand, sight }
 * look:  how mapView.js draws it ('stone', 'wood', ...), or null when a
 *        prop draws it (rocks, trees, lanterns, bamboo) or it is invisible
 * stand: its top is a place where a player may stand (later: teleport spots)
 * sight: it blocks shots and sight (later: the rifle and the bot)
 */
export const BOXES = [];
/** Things that are drawn but are not boxes themselves: { type, ... } */
export const PROPS = [];

function box(look, x0, x1, y0, y1, z0, z1, { stand = true, sight = true } = {}) {
  BOXES.push({ x0, x1, y0, y1, z0, z1, look, stand, sight });
}

/** A box given by its middle point on the ground and its size. */
function block(look, x, z, w, d, y0, y1, flags) {
  box(look, x - w / 2, x + w / 2, y0, y1, z - d / 2, z + d / 2, flags);
}

// ── The temple wall around everything ─────────────────────────────────
{
  const h = SIZE / 2;
  const t = 0.8;
  box('wall', -h - t, h + t, 0, WALL_HEIGHT, -h - t, -h, { stand: false });
  box('wall', -h - t, h + t, 0, WALL_HEIGHT, h, h + t, { stand: false });
  box('wall', -h - t, -h, 0, WALL_HEIGHT, -h, h, { stand: false });
  box('wall', h, h + t, 0, WALL_HEIGHT, -h, h, { stand: false });
}

// ── Middle: the raked gravel garden with large rocks ──────────────────
PROPS.push({ type: 'gravel', x0: -8, x1: 8, z0: -7, z1: 7 });
for (const [x, z, w, d, h] of [
  [-4, -3, 1.8, 1.4, 1.3],
  [3.2, -4, 2.2, 1.6, 1.0],
  [-2, 3.6, 1.6, 1.4, 1.2],
  [5, 2.6, 1.3, 2.0, 0.9],
  [0.6, -0.2, 1.0, 0.9, 0.7],
]) {
  block(null, x, z, w, d, 0, h);
  PROPS.push({ type: 'rock', x, z, w, d, h });
}

// ── North-west: the three-storey pagoda ───────────────────────────────
{
  const cx = -14;
  const cz = -15;
  block('stone', cx, cz, 8, 8, 0, 0.4); // stone base
  block('red', cx, cz, 4, 4, 0.4, 3.4); // ground floor
  block('wood', cx, cz, 7, 7, 3.4, 3.6); // balcony floor
  block('plaster', cx, cz, 3.6, 3.6, 3.6, 6.4); // second storey
  block('tiles', cx, cz, 8, 8, 6.4, 6.7, { stand: false }); // eave
  block('red', cx, cz, 3.2, 3.2, 6.7, 9.0); // third storey
  block('tiles', cx, cz, 6.6, 6.6, 9.0, 9.3, { stand: false }); // top eave
  PROPS.push({ type: 'roof', x: cx, z: cz, w: 8, y: 6.7, h: 0.9 });
  PROPS.push({ type: 'roof', x: cx, z: cz, w: 6.6, y: 9.3, h: 1.6 });
  PROPS.push({ type: 'spire', x: cx, z: cz, y: 10.9 });
  // Balcony railing (0.9 m), open on the east side where the stairs arrive.
  const r = { stand: false };
  box('red', cx - 3.5, cx + 3.5, 3.6, 4.5, cz - 3.5, cz - 3.4, r);
  box('red', cx - 3.5, cx + 3.5, 3.6, 4.5, cz + 3.4, cz + 3.5, r);
  box('red', cx - 3.5, cx - 3.4, 3.6, 4.5, cz - 3.5, cz + 3.5, r);
  box('red', cx + 3.4, cx + 3.5, 3.6, 4.5, cz - 3.5, cz + 1, r);
  box('red', cx + 3.4, cx + 3.5, 3.6, 4.5, cz + 3, cz + 3.5, r);
  // Stairs: eleven steps of 0.3 m running north, then a landing at 3.6 m
  // that leads onto the balcony through the gap in the railing.
  for (let k = 0; k < 11; k++) {
    const z1 = -6 - 0.5 * k;
    box('stone', -9.8, -8.4, 0, 0.3 * (k + 1), z1 - 0.5, z1);
  }
  box('stone', -10.5, -8.4, 0, 3.6, -14, -11.5);
}

// ── East: the tea house with its veranda ──────────────────────────────
{
  box('stone', 16, 22.5, 0, 1.5, -6, 1); // foundation
  box('plaster', 16, 22.5, 1.5, 3.9, -6, 1); // the house
  box('wood', 14, 16, 0, 1.5, -8, 1); // veranda, west side
  box('wood', 16, 23.5, 0, 1.5, -8, -6); // veranda, north side
  box('tiles', 13.5, 24, 3.9, 4.2, -8.5, 1.5, { stand: false }); // roof
  PROPS.push({ type: 'roof', x: 18.75, z: -3.5, w: 10.5, d: 10, y: 4.2, h: 1.3 });
  PROPS.push({ type: 'teahouse', x0: 16, x1: 22.5, z0: -6, z1: 1, y0: 1.5, y1: 3.9 });
  // Four wooden steps up to the veranda from the west.
  for (let k = 0; k < 4; k++) {
    box('wood', 12.4 + 0.4 * k, 12.8 + 0.4 * k, 0, 0.3 * (k + 1), -4, -2);
  }
}

// ── South-west: the stepped hill with the bell frame ──────────────────
{
  const cx = -15;
  const cz = 15;
  const tiers = [7, 5.8, 4.6, 3.4, 2.3]; // half the width of each tier
  tiers.forEach((half, i) => block('grass', cx, cz, half * 2, half * 2, 0, 0.4 * (i + 1)));
  const top = 0.4 * tiers.length;
  const post = { stand: false };
  block('wood', cx - 1.3, cz, 0.3, 0.3, top, top + 3, post);
  block('wood', cx + 1.3, cz, 0.3, 0.3, top, top + 3, post);
  block('wood', cx, cz, 3.2, 0.4, top + 2.6, top + 2.9, post); // cross beam
  block('tiles', cx, cz, 3.8, 1.4, top + 3, top + 3.2, post); // little roof
  block(null, cx, cz, 1, 1, top + 1.9, top + 2.6, post); // the bell
  PROPS.push({ type: 'bell', x: cx, z: cz, y0: top + 1.9, y1: top + 2.6 });
}

// ── South-east: the koi pond and the red bridge ───────────────────────
{
  PROPS.push({ type: 'pond', x0: 6, x1: 18, z0: 11, z1: 18 });
  // Nobody can step into the water: two invisible blocks fill the pond on
  // both sides of the bridge. They do not stop shots or sight.
  const water = { stand: false, sight: false };
  box(null, 6, 10.85, 0, 3, 11, 18, water);
  box(null, 13.15, 18, 0, 3, 11, 18, water);
  // The bridge rises in steps of 0.2 m to 0.8 m and down again.
  const deck = [
    [9.5, 10.5, 0.2],
    [10.5, 11.5, 0.4],
    [11.5, 12.5, 0.6],
    [12.5, 16.5, 0.8],
    [16.5, 17.5, 0.6],
    [17.5, 18.5, 0.4],
    [18.5, 19.5, 0.2],
  ];
  for (const [z0, z1, top] of deck) box('red', 11, 13, top - 0.15, top, z0, z1);
  // Railings down to the water, so nobody falls into the pond.
  box('red', 10.85, 11, 0, 1.7, 10.5, 18.5, { stand: false });
  box('red', 13, 13.15, 0, 1.7, 10.5, 18.5, { stand: false });
}

// ── Torii gate on the south path ──────────────────────────────────────
block('red', -1.7, 10, 0.4, 0.4, 0, 4.0, { stand: false });
block('red', 1.7, 10, 0.4, 0.4, 0, 4.0, { stand: false });
block('red', 0, 10, 4.4, 0.3, 3.2, 3.45, { stand: false });
block('dark', 0, 10, 5.6, 0.6, 4.0, 4.35, { stand: false });

// ── Low stone walls (about 1.1 m: cover when crouching) ───────────────
for (const [x0, x1, z0, z1] of [
  [-3, 3, 17.6, 18.2], // in front of the south start point
  [-3, 3, -18.2, -17.6], // in front of the north start point
  [-11, -10.4, -3, 3],
  [10.4, 11, -2, 4],
  [14, 19, 5.7, 6.3],
  [-19, -14, -3.3, -2.7],
]) {
  box('stone', x0, x1, 0, 1.1, z0, z1);
}

// ── Stone lanterns ────────────────────────────────────────────────────
for (const [x, z] of [
  [-6, 19],
  [6, 19],
  [-6, -19],
  [6, -19],
  [9, -8],
  [-7, 8.5],
  [3, 7.8],
  [-21, -12],
]) {
  block(null, x, z, 0.7, 0.7, 0, 1.7, { stand: false });
  PROPS.push({ type: 'lantern', x, z });
}

// ── Cherry trees (trunk, and a crown that blocks sight) ───────────────
for (const [x, z] of [
  [-6, -11],
  [8, -13],
  [-21, 4],
  [3, 13],
  [21, 8],
  [-12, -22],
  [19, 21],
]) {
  block(null, x, z, 0.5, 0.5, 0, 2.6, { stand: false });
  block(null, x, z, 3.6, 3.6, 2.4, 5.2, { stand: false });
  PROPS.push({ type: 'tree', x, z });
}

// ── Bamboo groves (dense: nobody walks or sees through them) ──────────
for (const [x0, x1, z0, z1] of [
  [15, 21, -21, -15],
  [-24, -21, -7, 1],
  [20.5, 24, 13, 23],
  [-3, 1, -24.5, -22.5],
]) {
  box(null, x0, x1, 0, 6, z0, z1, { stand: false });
  PROPS.push({ type: 'bamboo', x0, x1, z0, z1 });
}

// ── Stepping stones on the paths (flat, only drawn) ───────────────────
for (const [x, z] of [
  [0, 16],
  [0.4, 14.6],
  [-0.3, 13.2],
  [0.2, 11.6],
  [0, 8.6],
  [-0.4, -9],
  [0.3, -10.5],
  [-0.2, -12],
  [0.2, -13.5],
  [0, -15],
  [11, -3],
  [9.8, -2.2],
]) {
  PROPS.push({ type: 'stone', x, z });
}

// ── Standing spots (where a teleport can land) ───────────────────────

/** Body size used for the standing spots; the same numbers as `move` in config.js. */
const BODY_RADIUS = 0.35;
const BODY_HEIGHT = 1.75;
const GRID = 0.75; // metres between two spots

/** Does a standing body fit at this spot (no box in the way)? */
function fits(x, y, z) {
  const r = BODY_RADIUS;
  return !BOXES.some(
    (b) =>
      b.y1 > y + 0.001 &&
      b.y0 < y + BODY_HEIGHT - 0.001 &&
      x + r > b.x0 &&
      x - r < b.x1 &&
      z + r > b.z0 &&
      z - r < b.z1,
  );
}

/** Spots on a grid over one flat surface (a rectangle at height y). */
function gridOver(x0, x1, z0, z1, y, out) {
  const start = (lo, hi) => lo + Math.min(GRID / 2, (hi - lo) / 2);
  for (let x = start(x0, x1); x <= x1; x += GRID) {
    for (let z = start(z0, z1); z <= z1; z += GRID) {
      if (fits(x, y, z)) out.push({ x: Math.round(x * 1000) / 1000, y, z: Math.round(z * 1000) / 1000 });
    }
  }
}

/**
 * Every place where a player can stand: a grid of about 0.75 m on the
 * ground and on the top of every box that may be stood on (stairs,
 * balcony, veranda, hill, bridge, rocks, low walls ...), keeping only the
 * spots where the whole body fits. Never in a wall, tree, lantern or roof,
 * never in the pond (its invisible blocks are in the way). Worked out once
 * when the game loads; the order is the same on every screen.
 */
export const SPOTS = (() => {
  const out = [];
  const h = SIZE / 2 - BODY_RADIUS;
  gridOver(-h, h, -h, h, 0, out);
  for (const b of BOXES) if (b.stand) gridOver(b.x0, b.x1, b.z0, b.z1, b.y1, out);
  return out;
})();

/**
 * Straw target dummies to try the rifle on, at different heights and
 * distances: in the middle, on the pagoda balcony, the tea house veranda,
 * the hill and the bridge. They are only there while the game is being
 * built and go away when the bot arrives (step 6 of the plan).
 */
export const DUMMIES = [
  { x: 0, y: 0, z: 2 },
  { x: -14, y: 3.6, z: -12.3 },
  { x: 19, y: 1.5, z: -7 },
  { x: -15, y: 2, z: 13.4 },
  { x: 12, y: 0.8, z: 15 },
  { x: -5, y: 0, z: -14 },
  { x: 8, y: 0, z: -4 },
];

/**
 * The two fixed start points on opposite sides of the garden. A view
 * direction (yaw) of 0 looks towards -z, so both start out looking at the
 * middle. Players swap sides every round.
 */
export const STARTS = [
  { x: 0, z: 21, yaw: 0 },
  { x: 0, z: -21, yaw: Math.PI },
];

/** The start point of a seat in a round (round 1, 2, 3, ...). */
export function startOf(seat, round) {
  return STARTS[(seat + round - 1) % 2];
}
