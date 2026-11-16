// Inkwars – how characters and inputs are packed for the network. Host and
// guest both use this file, so the two sides can never disagree about the
// order of the numbers. Short lists of numbers are much smaller than objects
// with names, and they are sent about 30 times per second.

const FISH = 1;
const GROUNDED = 2;
const CLIMBING = 4;
const OWN_INK = 8;
const ENEMY_INK = 16;
const ALIVE = 32;
const SHOOT = 1;
const JUMP = 2;

const num = (v) => (Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, num(v)));

/** Host: the state of one character as a list of numbers. */
export function packActor(a) {
  const flags =
    (a.fish ? FISH : 0) |
    (a.grounded ? GROUNDED : 0) |
    (a.climbing ? CLIMBING : 0) |
    (a.inOwnInk ? OWN_INK : 0) |
    (a.inEnemyInk ? ENEMY_INK : 0) |
    (a.alive ? ALIVE : 0);
  return [
    a.pos.x,
    a.pos.y,
    a.pos.z,
    a.vel.x,
    a.vel.y,
    a.vel.z,
    a.yaw,
    a.input.aimYaw,
    a.input.aimPitch,
    a.morph,
    flags,
    a.hp,
    a.tank,
    a.respawnT,
    a.invuln,
  ];
}

/**
 * Guest: takes over everything except the position, which is smoothed in
 * guest.js. own is true for the guest's own character: the guest moves it
 * itself, so only what the host alone decides is taken over (life, tank,
 * out or not, protection after coming back in).
 */
export function unpackActor(a, list, own) {
  const flags = num(list[10]);
  a.alive = Boolean(flags & ALIVE);
  a.hp = num(list[11]);
  a.tank = num(list[12]);
  a.respawnT = num(list[13]);
  a.invuln = num(list[14]);
  if (own) return;
  a.vel.set(num(list[3]), num(list[4]), num(list[5]));
  a.yaw = num(list[6]);
  a.input.aimYaw = num(list[7]);
  a.input.aimPitch = num(list[8]);
  a.morph = clamp(list[9], 0, 1);
  a.fish = Boolean(flags & FISH);
  a.grounded = Boolean(flags & GROUNDED);
  a.climbing = Boolean(flags & CLIMBING);
  a.inOwnInk = Boolean(flags & OWN_INK);
  a.inEnemyInk = Boolean(flags & ENEMY_INK);
}

/**
 * Guest: the keys and aim of one step of the rules as whole numbers
 * (movement in hundredths, angles in thousandths of a radian), which take
 * few bytes. seenMs is the moment on the host's clock that the guest's
 * screen showed (see guest.js), -1 if not known yet.
 * The guest moves its own character with exactly these rounded values, so
 * host and guest work with the same numbers.
 */
export function packInput(inp, seenMs) {
  const flags = (inp.shoot ? SHOOT : 0) | (inp.jump ? JUMP : 0) | (inp.fish ? FISH << 2 : 0);
  return [
    Math.round(inp.moveX * 100),
    Math.round(inp.moveZ * 100),
    Math.round(inp.aimYaw * 1000),
    Math.round(inp.aimPitch * 1000),
    flags,
    seenMs,
  ];
}

/**
 * Writes a list made by packInput() into an input object. Every value is
 * checked, because on the host it comes from another computer.
 */
export function unpackInput(inp, list) {
  if (!Array.isArray(list)) return;
  inp.moveX = clamp(list[0] / 100, -1, 1);
  inp.moveZ = clamp(list[1] / 100, -1, 1);
  inp.aimYaw = num(list[2] / 1000);
  inp.aimPitch = clamp(list[3] / 1000, -1.5, 1.5);
  const flags = num(list[4]);
  inp.shoot = Boolean(flags & SHOOT);
  inp.jump = Boolean(flags & JUMP);
  inp.fish = Boolean(flags & (FISH << 2));
}

/** The moment a step list (packInput) says the guest saw, in seconds, or null. */
export function seenOf(list) {
  const ms = Array.isArray(list) ? list[5] : -1;
  return Number.isFinite(ms) && ms >= 0 ? ms / 1000 : null;
}
