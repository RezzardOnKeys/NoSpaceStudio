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
 * guest.js. keepAim is true for the guest's own character: its arm follows
 * the own mouse right away instead of the echo from the host.
 */
export function unpackActor(a, list, keepAim) {
  a.vel.set(num(list[3]), num(list[4]), num(list[5]));
  a.yaw = num(list[6]);
  if (!keepAim) {
    a.input.aimYaw = num(list[7]);
    a.input.aimPitch = num(list[8]);
  }
  a.morph = clamp(list[9], 0, 1);
  const flags = num(list[10]);
  a.fish = Boolean(flags & FISH);
  a.grounded = Boolean(flags & GROUNDED);
  a.climbing = Boolean(flags & CLIMBING);
  a.inOwnInk = Boolean(flags & OWN_INK);
  a.inEnemyInk = Boolean(flags & ENEMY_INK);
  a.alive = Boolean(flags & ALIVE);
  a.hp = num(list[11]);
  a.tank = num(list[12]);
  a.respawnT = num(list[13]);
  a.invuln = num(list[14]);
}

/** Guest: keys and aim as a list of numbers. */
export function packInput(inp) {
  const flags = (inp.shoot ? SHOOT : 0) | (inp.jump ? JUMP : 0) | (inp.fish ? FISH << 2 : 0);
  return [inp.moveX, inp.moveZ, inp.aimYaw, inp.aimPitch, flags];
}

/**
 * Host: writes a guest's list into the input of its character. Every value
 * is checked, because it comes from another computer.
 */
export function unpackInput(inp, list) {
  if (!Array.isArray(list)) return;
  inp.moveX = clamp(list[0], -1, 1);
  inp.moveZ = clamp(list[1], -1, 1);
  inp.aimYaw = num(list[2]);
  inp.aimPitch = clamp(list[3], -1.5, 1.5);
  const flags = num(list[4]);
  inp.shoot = Boolean(flags & SHOOT);
  inp.jump = Boolean(flags & JUMP);
  inp.fish = Boolean(flags & (FISH << 2));
}
